Get-ChildItem -Recurse -File |
    Where-Object {
        $_.FullName -notmatch '\\(node_modules|data|out|dist)\\' -and
        $_.Extension -notin '.db', '.zip', '.db-wal', '.db-shm', '.rar', '.env', '.vsix', '.exe' -and
        $_.Name -notin 'package-lock.json', 'cookies.txt'
    } |
    ForEach-Object {
        "--- FILE: $($_.FullName) ---`n$(Get-Content $_.FullName -Raw)`n`n"
    } |
    Out-File -FilePath "all_contents.txt" -Encoding utf8;
notepad "all_contents.txt"
