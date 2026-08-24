import urllib.request, json, os

games = ['Castlevania', 'Ninja Gaiden', 'Mega Man 2', 'Super Mario Bros 3', 'Excitebike', 'Life Force', 'Gradius']

for g in games:
    print(f"Searching for {g}...")
    q = urllib.parse.quote(g + ' nes')
    url = f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier&output=json"
    try:
        res = json.loads(urllib.request.urlopen(url).read())
        docs = res['response']['docs']
        if not docs:
            print(f"NO RESULTS for {g}")
            continue
        
        ident = docs[0]['identifier']
        print(f"Found identifier: {ident}")
        
        files_url = f"https://archive.org/metadata/{ident}/files"
        files_res = json.loads(urllib.request.urlopen(files_url).read())
        
        for f in files_res['result']:
            name = f['name']
            if name.endswith('.nes'):
                dl_url = f"https://archive.org/download/{ident}/{urllib.parse.quote(name)}"
                filename = g.replace(' ', '').lower() + ".nes"
                print(f"Downloading {filename}...")
                urllib.request.urlretrieve(dl_url, filename)
                print(f"Saved {filename}")
                break
    except Exception as e:
        print(f"Error processing {g}: {e}")
