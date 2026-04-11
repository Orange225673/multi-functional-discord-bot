Get-ChildItem -Recurse -File |
    Where-Object {
        $_.FullName -notmatch '\\(node_modules|data|out|dist|systems|data|assets)\\' -and
        $_.Extension -notin '.db', '.zip', '.db-wal', '.db-shm', '.rar', '.env', '.vsix', '.exe' -and
        $_.Name -notin 'package-lock.json', 'deployCommands.js', 'slashHandler.js'
    } |
    ForEach-Object {
        "--- FILE: $($_.FullName) ---`n$(Get-Content $_.FullName -Raw)`n`n"
    } |
    Out-File -FilePath "all_contents.txt" -Encoding utf8;
notepad "all_contents.txt"
