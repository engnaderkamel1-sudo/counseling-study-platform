param(
    [switch]$Watch
)

$appDir = $PSScriptRoot
if (-not $appDir) { $appDir = (Get-Location).Path }
$srcDir = Join-Path $appDir "src"
$outIndex = Join-Path $appDir "index.html"

$utf8 = [System.Text.Encoding]::UTF8
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Build-App {
    Write-Host "[Build] Bundling files with Error Reporting system..." -ForegroundColor Cyan

    $head = [System.IO.File]::ReadAllText((Join-Path $srcDir "template-head.html"), $utf8)
    $tail = [System.IO.File]::ReadAllText((Join-Path $srcDir "template-tail.html"), $utf8)

    $modules = @(
        "config/appConfig.js",
        "config/versesBank.js",
        "config/firebase.js",
        "services/cloudSync.js",
        "services/geminiService.js",
        "services/notificationService.js",
        "services/errorReportService.js",
        "services/edgeTtsService.js",
        "utils/helpers.js",
        "utils/embedHelpers.js",
        "components/SplashScreen.js",
        "components/Sidebar.js",
        "components/Header.js",
        "components/BottomNav.js",
        "components/AuthModal.js",
        "components/ErrorBoundary.js",
        "components/ErrorReporterModal.js",
        "components/FeatureRequestModal.js",
        "components/InstallPromptModal.js",
        "components/NotificationCenterModal.js",
        "components/RecycleBinModal.js",
        "components/books/AddBookModal.js",
        "components/books/BookCoverModal.js",
        "components/books/BookSummaryModal.js",
        "components/books/ChapterEditModal.js",
        "components/books/ChapterTextViewerModal.js",
        "components/books/ChapterExtractConfigModal.js",
        "components/books/ChaptersReviewModal.js",
        "components/books/BookQualityAuditModal.js",
        "components/books/PdfReaderView.js",
        "components/books/AudioChaptersView.js",
        "components/lectures/LectureRow.js",
        "components/lectures/LectureViewerModal.js",
        "components/lectures/LectureEditModal.js",
        "components/lectures/AddLectureModal.js",
        "pages/LecturesPage.js",
        "pages/BooksPage.js",
        "pages/StudentGuidePage.js",
        "pages/CurriculumPage.js",
        "pages/NotesPage.js",
        "pages/UsersManagementPage.js",
        "pages/ErrorReportsAdminPage.js",
        "pages/SettingsPage.js",
        "pages/UpdatesPage.js",
        "App.js"
    )

    $bodyParts = [System.Collections.Generic.List[string]]::new()
    $bodyParts.Add($head)

    # توليد سجل آخر 50 تحديث تلقائياً من Git وحقنها ككائن JavaScript
    $gitLogLines = git log -n 50 --pretty=format:"%h|%ad|%s" --date=format:"%Y-%m-%d %H:%M" 2>$null
    $updatesList = @()
    if ($gitLogLines) {
        foreach ($line in $gitLogLines) {
            $parts = $line.Split('|')
            if ($parts.Count -ge 3) {
                $h = $parts[0].Trim()
                $d = $parts[1].Trim()
                $m = ($parts[2..($parts.Count - 1)] -join '|').Trim()
                $updatesList += [PSCustomObject]@{
                    hash = $h
                    date = $d
                    message = $m
                }
            }
        }
    }
    $updatesJson = ($updatesList | ConvertTo-Json -Compress)
    $bodyParts.Add("// Updates history")
    $bodyParts.Add("window.APP_UPDATES_HISTORY = " + $updatesJson + ";")

    $buildTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
    $buildIso = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")

    foreach ($m in $modules) {
        $p = Join-Path $srcDir $m
        if (Test-Path $p) {
            $code = [System.IO.File]::ReadAllText($p, $utf8)
            if ($m -eq "config/appConfig.js") {
                $code = $code -replace 'buildTime:\s*"[^"]*"', ('buildTime: "' + $buildIso + '"')
                $code = $code -replace 'version:\s*"[^"]*"', ('version: "1.2.' + $buildTimestamp + '"')
            }
            $bodyParts.Add("// Module: " + $m)
            $bodyParts.Add($code)
        }
    }

    $bodyParts.Add($tail)

    $finalHtml = [string]::Join("`n", $bodyParts)
    try {
        [System.IO.File]::WriteAllText($outIndex, $finalHtml, $utf8NoBom)
    } catch {
        $tempIndex = Join-Path $appDir "index.html.tmp"
        [System.IO.File]::WriteAllText($tempIndex, $finalHtml, $utf8NoBom)
        Move-Item -Path $tempIndex -Destination $outIndex -Force
    }
    $publicDir = Join-Path $appDir "public"
    if (Test-Path $publicDir) {
        try {
            [System.IO.File]::WriteAllText((Join-Path $publicDir "index.html"), $finalHtml, $utf8NoBom)
        } catch {
            $tempPub = Join-Path $publicDir "index.html.tmp"
            [System.IO.File]::WriteAllText($tempPub, $finalHtml, $utf8NoBom)
            Move-Item -Path $tempPub -Destination (Join-Path $publicDir "index.html") -Force
        }
    }

    # تحديث رقم كاش الـ Service Worker فوراً مع كل بناء لتحديث المتصفح تلقائياً
    $swPath = Join-Path $appDir "sw.js"
    if (Test-Path $swPath) {
        $swCode = [System.IO.File]::ReadAllText($swPath, $utf8)
        $swCode = $swCode -replace "const CACHE_NAME = '[^']*';", ("const CACHE_NAME = 'counseling-pwa-v" + $buildTimestamp + "';")
        [System.IO.File]::WriteAllText($swPath, $swCode, $utf8NoBom)
        if (Test-Path $publicDir) {
            $publicSw = Join-Path $publicDir "sw.js"
            [System.IO.File]::WriteAllText($publicSw, $swCode, $utf8NoBom)
        }
    }

    Write-Host "[Build] App bundled successfully (HTML + Service Worker cache v$buildTimestamp)" -ForegroundColor Green
}

Build-App
