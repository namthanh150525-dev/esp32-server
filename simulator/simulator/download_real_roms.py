import urllib.request
import urllib.parse
import zipfile
import os

games = {
    'Super Mario Bros. 3 (USA).zip': 'supermariobros3.nes',
    'Mega Man 2 (USA).zip': 'megaman2.nes',
    'Castlevania (USA).zip': 'castlevania.nes',
    'Ninja Gaiden (USA).zip': 'ninjagaiden.nes',
    'Excitebike (Japan, USA).zip': 'excitebike.nes',
    'Life Force (USA).zip': 'lifeforce.nes',
    'Gradius (USA).zip': 'gradius.nes'
}

base_url = "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20(Headered)/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://myrient.erista.me/'
}

for zip_filename, target_filename in games.items():
    url = base_url + urllib.parse.quote(zip_filename)
    print(f"Downloading {zip_filename}...")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response, open('temp.zip', 'wb') as out_file:
            out_file.write(response.read())
        
        with zipfile.ZipFile('temp.zip', 'r') as zip_ref:
            nes_file = [f for f in zip_ref.namelist() if f.endswith('.nes')][0]
            zip_ref.extract(nes_file)
            if os.path.exists(target_filename):
                os.remove(target_filename)
            os.rename(nes_file, target_filename)
        print(f"Successfully saved to {target_filename}")
    except Exception as e:
        print(f"Failed to process {zip_filename}: {e}")

if os.path.exists('temp.zip'):
    os.remove('temp.zip')
