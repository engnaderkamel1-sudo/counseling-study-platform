$lines = Get-Content "src/pages/BooksPage.js"
$b = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    $o = ([regex]::Matches($clean, '\{')).Count
    $c = ([regex]::Matches($clean, '\}')).Count
    $b += ($o - $c)
    if ($b -eq 1 -and $i -gt 10 -and $i -lt 580) {
        # Check when balance drops to 1 inside function body (only function booksPage should have balance 1)
        Write-Host "Line $($i+1): dropped to 1 => $($line.Trim())"
    }
}
