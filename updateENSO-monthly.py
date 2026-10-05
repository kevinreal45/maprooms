from app.misc.scripts.enso_update import *

def main():
    sep = ''.join(['-'] * 60)

    print(f'{sep}\n Updating NOAA CPC Monthly OISST.v2.1')
    update_enso_oisstv21_cpc('monthly')

    print(f'{sep}\n Updating NOAA CPC Monthly ERSST v5')
    update_enso_ersstv5_cpc_monthly()

    print(f'{sep}\n Updating NOAA NCEI Monthly ERSST v5')
    update_enso_ersst_ncei(5)

    print(f'{sep}\n Updating NOAA NCEI Monthly ERSST v6')
    update_enso_ersst_ncei(6)

    print(f'{sep}\n Updating NOAA NCEI Monthly Indian Ocean Dipole (IOD) computed with ERSST v5')
    update_iod_ersst_ncei(5)

    print(f'{sep}\n Updating NOAA NCEI Monthly Indian Ocean Dipole (IOD) computed with ERSST v6')
    update_iod_ersst_ncei(6)

    print(f'{sep}\n Updating NOAA CPC Monthly North Atlantic Oscillation (NAO)')
    update_nao_cpc_cdas_monthly()

    print(f'{sep}\n Updating NOAA CPC Monthly Atlantic 3 Index (ATL3)')
    update_atl3_cpc_monthly()

if __name__ == '__main__':
    main()
