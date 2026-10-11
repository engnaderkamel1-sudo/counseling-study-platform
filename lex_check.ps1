$content = [System.IO.File]::ReadAllText("src/pages/LecturesPage.js", [System.Text.Encoding]::UTF8)

# Replace regex literals with empty regex
# In this file, lines 375, 377, 386, 389 have regexes
$content = $content -replace '/\^?\(\[.*?\][^\/]*\//', '""'
$content = $content -replace '/\^?\([^\/]*\//', '""'
$content = $content -replace '/[^\n]*?\/[gimsuy]*', '""'

$stack = [System.Collections.Generic.Stack[PSCustomObject]]::new()
$line = 1
$col = 1
$len = $content.Length
$inStr = $false
$strChar = ''
$inLineComment = $false
$inBlockComment = $false

for ($i = 0; $i -lt $len; $i++) {
    $c = $content[$i]
    if ($c -eq "`n") { $line++; $col = 1 } else { $col++ }

    if ($inLineComment) {
        if ($c -eq "`n") { $inLineComment = $false }
        continue
    }
    if ($inBlockComment) {
        if ($c -eq "*" -and $i+1 -lt $len -and $content[$i+1] -eq "/") {
            $inBlockComment = $false
            $i++
        }
        continue
    }
    if ($inStr) {
        if ($c -eq "\") { $i++; continue }
        if ($c -eq $strChar) { $inStr = $false }
        continue
    }

    if ($c -eq "/" -and $i+1 -lt $len) {
        $next = $content[$i+1]
        if ($next -eq "/") { $inLineComment = $true; $i++; continue }
        if ($next -eq "*") { $inBlockComment = $true; $i++; continue }
    }
    if ($c -eq '"' -or $c -eq "'") {
        $inStr = $true
        $strChar = $c
        continue
    }

    if ($c -eq "(") {
        $stack.Push([PSCustomObject]@{ Char="("; Line=$line; Col=$col })
    }
    elseif ($c -eq ")") {
        if ($stack.Count -eq 0) {
            Write-Host "Extra ')' at Line $line, Col $col" -ForegroundColor Red
        } else {
            $top = $stack.Pop()
            if ($top.Char -ne "(") {
                Write-Host "Mismatched ')' at Line $line, Col $col with '$($top.Char)' from Line $($top.Line), Col $($top.Col)" -ForegroundColor Red
            }
        }
    }
    elseif ($c -eq "{") {
        $stack.Push([PSCustomObject]@{ Char="{"; Line=$line; Col=$col })
    }
    elseif ($c -eq "}") {
        if ($stack.Count -eq 0) {
            Write-Host "Extra '}' at Line $line, Col $col" -ForegroundColor Red
        } else {
            $top = $stack.Pop()
            if ($top.Char -ne "{") {
                Write-Host "Mismatched '}' at Line $line, Col $col with '$($top.Char)' from Line $($top.Line), Col $($top.Col)" -ForegroundColor Red
            }
        }
    }
    elseif ($c -eq "[") {
        $stack.Push([PSCustomObject]@{ Char="["; Line=$line; Col=$col })
    }
    elseif ($c -eq "]") {
        if ($stack.Count -eq 0) {
            Write-Host "Extra ']' at Line $line, Col $col" -ForegroundColor Red
        } else {
            $top = $stack.Pop()
            if ($top.Char -ne "[") {
                Write-Host "Mismatched ']' at Line $line, Col $col with '$($top.Char)' from Line $($top.Line), Col $($top.Col)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "Remaining unclosed items in stack: $($stack.Count)"
foreach ($t in $stack) {
    Write-Host "Unclosed '$($t.Char)' from Line $($t.Line), Col $($t.Col)" -ForegroundColor Yellow
}
