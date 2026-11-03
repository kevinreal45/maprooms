import calendar
import re
from pathlib import Path

import numpy as np


from app.scripts._global import GLOBAL_CONFIG
from app.scripts.util import pretty

from app.misc.scripts.probabilities import DISTRIBUTIONS, ecdf_ts, ecdf_smooth_v2

from .projection_data import (
    get_climate_projection_dataset,
    get_climate_projection_variable,
)

from .projection_sp import (
    _integer,
    _seasonal_values,
    _projection_period_years,
)

from .projection_spi import (
    _projection_spi_polygon,
    _subset_projection_spi_polygon,
)


def _seasonal_chart_location(params):
    params = dict(params)
    params.pop("_chart_polygon", None)

    mode = params.get("geomExtract", "points")

    if mode == "polygons":
        polygon = _projection_spi_polygon(params)
        params["_chart_polygon"] = polygon

        lon = float(polygon["lon"])
        lat = float(polygon["lat"])

    elif mode == "points":
        points = params.get("pointsList")

        if not isinstance(points, list) or not points:
            raise ValueError("Select a point on the map.")

        lon = float(points[0]["lon"])
        lat = float(points[0]["lat"])

    else:
        raise ValueError("Unsupported spatial selection.")

    if not np.isfinite([lon, lat]).all():
        raise ValueError("Invalid selection coordinates.")

    return params, (lon + 180) % 360 - 180, lat


def _select_seasonal_chart_data(data, params, lon, lat):
    data = (
        data.assign_coords(lon=((data.lon + 180) % 360) - 180)
        .sortby("lon")
        .sortby("lat")
    )

    polygon = params.get("_chart_polygon")

    if polygon is not None:
        # Keep fallback coordinates independent for each dataset.
        selection = dict(polygon)

        selected, _, mask = _subset_projection_spi_polygon(
            data,
            data,
            selection,
        )

        return (
            selected.where(mask),
            float(selection["lon"]),
            float(selection["lat"]),
        )

    if not (
        float(data.lon.min()) <= lon <= float(data.lon.max())
        and float(data.lat.min()) <= lat <= float(data.lat.max())
    ):
        raise ValueError("Selected point is outside the dataset.")

    selected = data.sel(
        lon=[lon],
        lat=[lat],
        method="nearest",
    )

    return (
        selected,
        float(selected.lon.values[0]),
        float(selected.lat.values[0]),
    )


def _point_seasonal_sample(dataset, params, lon, lat, year, period, start, end):
    data = get_climate_projection_variable(dataset, params)
    units = data.attrs["units"]

    point, selected_lon, selected_lat = _select_seasonal_chart_data(
        data, params, lon, lat
    )

    rainfall = params["variable"] == "rainfall"

    seasonal = (
        _seasonal_values(
            point,
            year,
            period,
            start,
            end,
            rainfall=rainfall,
        )
        .mean(
            dim=("lat", "lon"),
            skipna=True,
        )
        .compute()
    )

    if rainfall:
        units = "mm"

    values = np.asarray(seasonal.values, dtype=float)
    values = values[np.isfinite(values)]

    if values.size < 2:
        raise ValueError("At least two valid seasonal values are required.")

    mean = float(np.mean(values))
    sd = float(np.std(values, ddof=0))

    if not np.isfinite(sd) or sd <= 0:
        raise ValueError(
            "A fitted density requires seasonal values with " "non-zero variability."
        )

    return {
        "values": values.tolist(),
        "mean": mean,
        "sd": sd,
        "count": int(values.size),
        "units": units,
        "lon": selected_lon,
        "lat": selected_lat,
    }


def climate_projection_ts_pdf(params):
    start = _integer(params, "seasStart", 1, 12)
    end = _integer(params, "seasEnd", 1, 12)
    historical_year, historical_end, future_year, future_end = _projection_period_years(
        params
    )

    crosses_year = int(end < start)

    historical_period = historical_end - historical_year + 1 - crosses_year
    period = future_end - future_year + 1 - crosses_year

    if historical_period < 1 or period < 1:
        raise ValueError("Each period must contain at least one complete season.")

    params, lon, lat = _seasonal_chart_location(params)

    lon = (lon + 180) % 360 - 180

    config = GLOBAL_CONFIG["climate_projection"]

    historical_params = {**params, "dataset": config["historical"]["dataset"]}
    future_params = {**params, "dataset": config["projection"]["dataset"]}

    with (
        get_climate_projection_dataset(historical_params) as historical_ds,
        get_climate_projection_dataset(future_params) as future_ds,
    ):
        historical = _point_seasonal_sample(
            historical_ds,
            historical_params,
            lon,
            lat,
            historical_year,
            historical_period,
            start,
            end,
        )
        future = _point_seasonal_sample(
            future_ds, future_params, lon, lat, future_year, period, start, end
        )

    if historical["units"] != future["units"]:
        raise ValueError("Historical and future units do not match.")

    lower = min(
        historical["mean"] - 4 * historical["sd"], future["mean"] - 4 * future["sd"]
    )
    upper = max(
        historical["mean"] + 4 * historical["sd"], future["mean"] + 4 * future["sd"]
    )

    observed = np.concatenate(
        [
            np.asarray(historical["values"], dtype=float),
            np.asarray(future["values"], dtype=float),
        ]
    )

    padding = 0.1 * np.ptp(observed)

    lower = min(lower, float(observed.min() - padding))
    upper = max(upper, float(observed.max() + padding))

    # ticks = pretty(lower, upper, 10).tolist()
    # x = np.linspace(ticks[0], ticks[-1], 512)

    if params["variable"] in ("maximum_temperature", "minimum_temperature"):
        step = 0.4

        first = int(np.floor(lower / step))
        last = int(np.ceil(upper / step))

        ticks = np.round(np.arange(first, last + 1) * step, 1).tolist()
    else:
        ticks = pretty(lower, upper, 10).tolist()

    x = np.linspace(ticks[0], ticks[-1], 512)

    for sample in (historical, future):
        density = DISTRIBUTIONS["norm"].pdf(x, mean=sample["mean"], sd=sample["sd"])

        if not np.isfinite(density).all():
            raise ValueError("Unable to calculate a finite density curve.")

        sample["pdf"] = {"fitted": {"x": x.tolist(), "y": density.tolist()}}

        values = np.asarray(sample["values"], dtype=float)

        empirical = ecdf_ts(values)
        smoothed = ecdf_smooth_v2(values, adj=1.0, extend=True, n=512)

        sample["cdf"] = {
            "empirical": {
                key: np.round(value, decimals=6).tolist()
                for key, value in empirical.items()
            },
            "smoothed": {
                key: np.round(value, decimals=6).tolist()
                for key, value in smoothed.items()
            },
        }

    historical["label"] = f"Historical {historical_year}–{historical_end}"
    future["label"] = f"{params['scenario']} {future_year}–{future_end}"

    variable = config["variables"][params["variable"]]
    variable_name = config["netcdf"][variable]["name"]
    season = f"{calendar.month_abbr[start]}–" f"{calendar.month_abbr[end]}"

    return {
        "status": 0,
        "data": {
            "historical": historical,
            "future": future,
            "xrange": [ticks[0], ticks[-1]],
            "xticks": ticks,
            "info": {
                "geom": {"name": "Point", "lon": lon, "lat": lat},
                "var": {
                    "name": variable_name,
                    "units": historical["units"],
                    "type": params["variable"],
                },
                "time_res": "seasonal",
                "season": season,
                "model": params["model"],
                "scenario": params["scenario"],
            },
        },
    }


def _available_future_models(params):
    config = GLOBAL_CONFIG["climate_projection"]

    if params["scenario"] not in config["scenarios"]:
        raise ValueError("Unknown projection scenario.")

    variable = config["variables"][params["variable"]]
    folder = config["netcdf"][variable]["folder"]

    root = Path(config["zarr_dir"]) / folder / config["projection"]["directory"]

    if not root.is_dir():
        return []

    return sorted(
        directory.name
        for directory in root.iterdir()
        if (
            directory.is_dir()
            and re.fullmatch(r"[a-z0-9_-]+", directory.name)
            and (directory / params["scenario"] / f"{variable}.zarr").is_dir()
        )
    )


def _point_seasonal_series(params, lon, lat, year, period, start, end):
    with get_climate_projection_dataset(params) as dataset:
        metadata = dict(dataset.attrs)
        data = get_climate_projection_variable(dataset, params)

        units = "mm" if params["variable"] == "rainfall" else data.attrs["units"]

        point, selected_lon, selected_lat = _select_seasonal_chart_data(
            data, params, lon, lat
        )

        final_year = year + period - 1 + int(end < start)

        point = point.sel(
            time=slice(f"{year:04d}-{start:02d}", f"{final_year:04d}-{end:02d}")
        ).load()

        seasonal = _seasonal_values(
            point,
            year,
            period,
            start,
            end,
            rainfall=params["variable"] == "rainfall",
        ).mean(
            dim=("lat", "lon"),
            skipna=True,
        )

    return {
        "years": seasonal.season_year.values.astype(int),
        "values": np.asarray(seasonal.values, dtype=float),
        "units": units,
        "lon": selected_lon,
        "lat": selected_lat,
        "metadata": metadata,
    }


def _series_json(values):
    return [float(value) if np.isfinite(value) else None for value in values]


def climate_projection_ts_series(params):
    start = _integer(params, "seasStart", 1, 12)
    end = _integer(params, "seasEnd", 1, 12)
    crosses_year = int(end < start)

    config = GLOBAL_CONFIG["climate_projection"]

    requested = params.get("scenarios", ["ssp1_2_6", "ssp5_8_5"])

    if (
        not isinstance(requested, list)
        or not requested
        or any(
            not isinstance(scenario, str) or scenario not in config["scenarios"]
            for scenario in requested
        )
    ):
        raise ValueError("Select at least one valid scenario.")

    scenarios = list(dict.fromkeys(requested))

    params, lon, lat = _seasonal_chart_location(params)

    lon = (lon + 180) % 360 - 180

    historical_start = 1981
    historical_end = 2014

    future_start = 2015
    future_end = 2100

    historical_period = historical_end - historical_start + 1 - crosses_year
    future_period = future_end - future_start + 1 - crosses_year

    if historical_period < 1 or future_period < 1:
        raise ValueError("Each period must contain at least one complete season.")

    historical_years = np.arange(historical_start, historical_start + historical_period)

    future_years = np.arange(future_start, future_start + future_period)

    variable_id = config["variables"][params["variable"]]

    historical_root = (
        Path(config["zarr_dir"])
        / config["netcdf"][variable_id]["folder"]
        / config["historical"]["directory"]
    )

    model_sets = [
        set(_available_future_models({**params, "scenario": scenario}))
        for scenario in scenarios
    ]

    candidates = sorted(set.intersection(*model_sets))

    candidates = [
        model
        for model in candidates
        if (historical_root / model / f"{variable_id}.zarr").is_dir()
    ]

    historical_members = []
    historical_anomalies = []

    future_members = {scenario: [] for scenario in scenarios}

    future_anomalies = {scenario: [] for scenario in scenarios}

    models = []
    units = None

    for model in candidates:
        historical = _point_seasonal_series(
            {**params, "model": model, "dataset": config["historical"]["dataset"]},
            lon,
            lat,
            historical_start,
            historical_period,
            start,
            end,
        )

        baseline_values = historical["values"]
        baseline_values = baseline_values[np.isfinite(baseline_values)]

        if baseline_values.size == 0:
            continue

        if not np.array_equal(historical["years"], historical_years):
            raise ValueError(f"Historical seasonal years differ for {model}.")

        if units is not None and historical["units"] != units:
            raise ValueError(f"Ensemble units differ for model {model}.")

        model_futures = {}

        for scenario in scenarios:
            future = _point_seasonal_series(
                {
                    **params,
                    "model": model,
                    "scenario": scenario,
                    "dataset": config["projection"]["dataset"],
                },
                lon,
                lat,
                future_start,
                future_period,
                start,
                end,
            )

            if historical["units"] != future["units"]:
                raise ValueError(
                    f"Historical/future units differ: " f"{model}, {scenario}."
                )

            if not np.array_equal(future["years"], future_years):
                raise ValueError(
                    f"Future seasonal years differ: " f"{model}, {scenario}."
                )

            if not (
                np.isclose(historical["lon"], future["lon"], rtol=0, atol=1e-6)
                and np.isclose(historical["lat"], future["lat"], rtol=0, atol=1e-6)
            ):
                raise ValueError(
                    f"Historical/future grid points differ: " f"{model}, {scenario}."
                )

            for historical_key, future_key in [
                ("source_id", "source_id"),
                ("source_id", "parent_source_id"),
                ("variant_label", "parent_variant_label"),
                ("grid_label", "grid_label"),
            ]:
                historical_value = historical["metadata"].get(historical_key)
                future_value = future["metadata"].get(future_key)

                if (
                    historical_value
                    and future_value
                    and historical_value != future_value
                ):
                    raise ValueError(
                        f"Model-pair metadata mismatch: "
                        f"{model}, {scenario}, "
                        f"{historical_key}/{future_key}."
                    )

            model_futures[scenario] = future["values"]

        if any(not np.isfinite(values).any() for values in model_futures.values()):
            continue

        baseline = float(np.mean(baseline_values))

        historical_members.append(historical["values"])
        historical_anomalies.append(historical["values"] - baseline)

        for scenario in scenarios:
            values = model_futures[scenario]
            future_members[scenario].append(values)
            future_anomalies[scenario].append(values - baseline)

        models.append(model)
        units = historical["units"]

    if not models:
        raise ValueError(
            "No valid GCM has historical data and all requested scenarios."
        )

    historical_stats = _ensemble_statistics(historical_members, historical_period)

    historical_anomaly_stats = _ensemble_statistics(
        historical_anomalies, historical_period
    )

    scenario_data = {}
    scenario_anomalies = {}

    for scenario in scenarios:
        scenario_data[scenario] = {
            "label": config["scenarios"][scenario]["label"],
            "years": future_years.tolist(),
            **_ensemble_statistics(future_members[scenario], future_period),
        }

        scenario_anomalies[scenario] = _ensemble_statistics(
            future_anomalies[scenario], future_period
        )

    variable_names = {
        "maximum_temperature": "Seasonal mean maximum temperature",
        "minimum_temperature": "Seasonal mean minimum temperature",
        "rainfall": "Seasonal total rainfall",
    }

    return {
        "status": 0,
        "data": {
            "historical": {"years": historical_years.tolist(), **historical_stats},
            "scenarios": scenario_data,
            "anomaly": {
                "historical": historical_anomaly_stats,
                "scenarios": scenario_anomalies,
                "baseline_period": [historical_start, historical_end],
                "baseline_method": "each_model_historical_mean",
            },
            "info": {
                "var": {
                    "name": variable_names[params["variable"]],
                    "units": units,
                    "type": params["variable"],
                },
                "season": (
                    f"{calendar.month_abbr[start]}–" f"{calendar.month_abbr[end]}"
                ),
                "scenarios": scenarios,
                "models": models,
                "spread": "minimum–maximum",
                "time_res": "seasonal",
                "season_year_convention": "starting_year",
                "geom": {
                    "name": params.get("Poly", "Point"),
                    "lon": lon,
                    "lat": lat,
                },
            },
        },
    }


def _ensemble_statistics(members, period):
    if not members:
        return {
            "mean": [None] * period,
            "minimum": [None] * period,
            "maximum": [None] * period,
            "count": [0] * period,
        }

    ensemble = np.stack(members)
    valid = np.isfinite(ensemble)
    count = valid.sum(axis=0)

    mean = np.divide(
        np.where(valid, ensemble, 0.0).sum(axis=0),
        count,
        out=np.full(period, np.nan),
        where=count > 0,
    )

    minimum = np.where(count > 0, np.where(valid, ensemble, np.inf).min(axis=0), np.nan)

    maximum = np.where(
        count > 0, np.where(valid, ensemble, -np.inf).max(axis=0), np.nan
    )

    return {
        "mean": _series_json(mean),
        "minimum": _series_json(minimum),
        "maximum": _series_json(maximum),
        "count": count.tolist(),
    }
