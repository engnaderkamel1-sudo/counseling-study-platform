$apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
$url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=' + $apiKey
$res = Invoke-RestMethod -Uri $url -Method Get
Write-Host "Chapter 4 audioUrl: " $res.fields.audioChapters.arrayValue.values[4].mapValue.fields.audioUrl.stringValue
