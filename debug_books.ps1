$ErrorActionPreference = "Continue"

$f = "src/pages/BooksPage.js"
$lines = Get-Content $f

$openP = 0
$closeP = 0
$openB = 0
$closeB = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $clean = $line -replace '"([^"\\]|\\.)*"', '""' -replace "'([^'\\]|\\.)*'", "''" -replace '//.*', ''
    
    $p1 = ([regex]::Matches($clean, [regex]::Escape("("))).Count
    $p2 = ([regex]::Matches($clean, [regex]::Escape(")"))).Count
    $b1 = ([regex]::Matches($clean, [regex]::Escape("{"))).Count
    $b2 = ([regex]::Matches($clean, [regex]::Escape("}"))).Count
    
    $openP += $p1
    $closeP += $p2
    $openB += $b1
    $closeB += $b2
    
    if ($openP -lt $closeP) {
        Write-Host "Paren negative balance at line $($i+1): $line" -ForegroundColor Red
        break
    }
    if ($openB -lt $closeB) {
        Write-Host "Brace negative balance at line $($i+1): $line" -ForegroundColor Red
        break
    }
}

Write-Host "BooksPage.js Total: ( = $openP, ) = $closeP, { = $openB, } = $closeB"
