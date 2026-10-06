$lines = Get-Content "src/services/geminiService.js"
$p = 0
for ($i = 0; $i -lt 70; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    $o = ([regex]::Matches($clean, [regex]::Escape("("))).Count
    $c = ([regex]::Matches($clean, [regex]::Escape(")"))).Count
    $p += ($o - $c)
    if ($o -gt 0 -or $c -gt 0) {
        Write-Host "Line $($i+1): balance=$p => $($line.Trim())"
    }
}
