# from app.dst_api.scripts.spei_compute import get_spi_distribution_pars_sp
from app.dst_api.scripts.spei_wrapper import get_spi_distribution_pars

def main():
    sep = ''.join(['-'] * 60)
    params = {
        'dataset': 'MON',
        'variable': 'precip',
        'analysis': 'spi',
        'distribution': 'gamma',
    }

    print(f'{sep}\n Computing SPI dekadal distribution parameters.')
    pars_dek = params.copy()
    pars_dek['temporalRes'] = 'dekadal'
    pars_dek['timeScale'] = 1
    tmp = get_spi_distribution_pars(pars_dek)

    print(f'{sep}\n Computing SPI monthly distribution parameters.')
    pars_mon = params.copy()
    pars_mon['temporalRes'] = 'monthly'
    pars_mon['timeScale'] = 1
    tmp = get_spi_distribution_pars(pars_mon)

    print(f'{sep}\n Computing SPI seasonal (3-months) distribution parameters.')
    pars_seas = params.copy()
    pars_seas['temporalRes'] = 'seasonal'
    pars_seas['timeScale'] = 3
    pars_seas['timeRes'] = 'monthly'
    tmp = get_spi_distribution_pars(pars_seas)

if __name__ == '__main__':
    main()
