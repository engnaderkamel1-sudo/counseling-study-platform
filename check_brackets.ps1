$ErrorActionPreference = "Continue"

function Count-Tokens($str, $token) {
    return ([regex]::Matches($str, [regex]::Escape($token))).Count
}

$files = Get-ChildItem -Path "src" -Recurse -Filter "*.js"
Write-Host "Scanning $($files.Count) JavaScript files..."

foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Strip strings and comments roughly to avoid counting brackets in strings
    # Replace strings
    $clean = $text -replace '`[^`]*`', '""'
    $clean = $clean -replace '"([^"\\]|\\.)*"', '""'
    $clean = $clean -replace "'([^'\\]|\\.)*'", "''"
    $clean = $clean -replace '//.*', ''
    
    $pOpen = Count-Tokens $clean "("
    $pClose = Count-Tokens $clean ")"
    $bOpen = Count-Tokens $clean "{"
    $bClose = Count-Tokens $clean "}"
    $sqOpen = Count-Tokens $clean "["
    $sqClose = Count-Tokens $clean "]"
    
    $err = $false
    if ($pOpen -ne $pClose) {
        Write-Host "PAREN MISMATCH in $($f.Name): ( = $pOpen vs ) = $pClose" -ForegroundColor Red
        $err = $true
    }
    if ($bOpen -ne $bClose) {
        Write-Host "BRACE MISMATCH in $($f.Name): { = $bOpen vs } = $bClose" -ForegroundColor Red
        $err = $true
    }
    if ($sqOpen -ne $sqClose) {
        Write-Host "BRACKET MISMATCH in $($f.Name): [ = $sqOpen vs ] = $sqClose" -ForegroundColor Red
        $err = $true
    }
    if (-not $err) {
        Write-Host "PASS: $($f.Name)" -ForegroundColor Green
    }
}
