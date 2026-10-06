$lines = Get-Content "src/pages/BooksPage.js"
$b = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    $o = ([regex]::Matches($clean, '\{')).Count
    $c = ([regex]::Matches($clean, '\}')).Count
    $prev = $b
    $b += ($o - $c)
    if ($b -gt $prev -and $i -lt 300) {
        Write-Host "Line $($i+1): balance became $b : $($line.Trim())"
    }
}
