$lines = Get-Content "src/pages/LecturesPage.js"
$b = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    $o = ([regex]::Matches($clean, '\(')).Count
    $c = ([regex]::Matches($clean, '\)')).Count
    $prev = $b
    $b += ($o - $c)
    if ($b -lt 0) {
        Write-Host "Paren balance went below 0 at line $($i+1): $b : $($line.Trim())"
        break
    }
}
Write-Host "Finished, final balance: $b"
