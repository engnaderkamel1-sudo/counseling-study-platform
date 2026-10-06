$lines = Get-Content "src/pages/BooksPage.js"
$b = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    $o = ([regex]::Matches($clean, '\{')).Count
    $c = ([regex]::Matches($clean, '\}')).Count
    $b += ($o - $c)
    if ($o -gt 0 -or $c -gt 0) {
        # Check if balance ever returns to 0
    }
}
Write-Host "Final brace balance: $b"
