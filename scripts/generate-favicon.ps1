Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
[xml]$logo = Get-Content -Raw -LiteralPath (Join-Path $root 'public/favicon.svg')
$background = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.rect.fill)
$mark = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.g.stroke)
$images = New-Object System.Collections.Generic.List[object]

function New-FaviconBitmap {
  param([int]$Size)

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.ScaleTransform($Size / 64.0, $Size / 64.0)

  $rectangle = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $rectangle.AddArc(0, 0, 30, 30, 180, 90)
  $rectangle.AddArc(34, 0, 30, 30, 270, 90)
  $rectangle.AddArc(34, 34, 30, 30, 0, 90)
  $rectangle.AddArc(0, 34, 30, 30, 90, 90)
  $rectangle.CloseFigure()
  $backgroundBrush = [System.Drawing.SolidBrush]::new($background)
  $graphics.FillPath($backgroundBrush, $rectangle)

  $markPen = [System.Drawing.Pen]::new($mark, 5.2)
  $markPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $markPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $markPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $leafPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $leafPath.StartFigure()
  $leafPath.AddBezier(30, 48, 42, 48, 50, 39, 50, 28)
  $leafPath.AddBezier(50, 28, 50, 22.8, 48.7, 17.8, 47.92, 13.438)
  $leafPath.AddBezier(47.92, 13.438, 47.64, 11.9, 45.64, 11.46, 44.41, 12.788)
  $leafPath.AddBezier(44.41, 12.788, 39.666, 19, 34, 19, 27.6, 20.2)
  $leafPath.AddBezier(27.6, 20.2, 20, 21.6, 14.6, 28.6, 16.2, 36.6)
  $leafPath.AddBezier(16.2, 36.6, 17.6, 43.2, 22.6, 48, 30, 48)
  $graphics.DrawPath($markPen, $leafPath)

  $graphics.DrawBezier($markPen, 12, 50, 12, 46.2, 14.16, 42.6, 17.822, 40.912)
  $graphics.DrawBezier($markPen, 17.822, 40.912, 23.226, 38.424, 24.702, 38.48, 30, 34)

  $graphics.Dispose()
  $markPen.Dispose()
  $leafPath.Dispose()
  $backgroundBrush.Dispose()
  $rectangle.Dispose()

  return $bitmap
}

foreach ($size in @(16, 32, 48, 64, 128, 256)) {
  $bitmap = New-FaviconBitmap -Size $size
  $stream = [System.IO.MemoryStream]::new()
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $images.Add([pscustomobject]@{ Size = $size; Bytes = $stream.ToArray() })
  if ($size -eq 32) {
    $bitmap.Save((Join-Path $root 'public/favicon-32x32.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Save((Join-Path $root 'public/plastic-free-favicon-32.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $stream.Dispose()
  $bitmap.Dispose()
}

foreach ($size in @(180, 192, 512)) {
  $bitmap = New-FaviconBitmap -Size $size
  $fileName = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$($size)x$($size).png" }
  $bitmap.Save((Join-Path $root "public/$fileName"), [System.Drawing.Imaging.ImageFormat]::Png)
  if ($size -eq 180) {
    $bitmap.Save((Join-Path $root 'public/apple-touch-icon-precomposed.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Save((Join-Path $root 'public/st-andrews-plastic-free-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  } elseif ($size -eq 192) {
    $bitmap.Save((Join-Path $root 'public/plastic-free-icon-192.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  } elseif ($size -eq 512) {
    $bitmap.Save((Join-Path $root 'public/plastic-free-icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $bitmap.Dispose()
}

$target = Join-Path $root 'public/favicon.ico'
$file = [System.IO.File]::Create($target)
$writer = [System.IO.BinaryWriter]::new($file)
try {
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$images.Count)
  $offset = 6 + 16 * $images.Count
  foreach ($image in $images) {
    $writer.Write([byte]($image.Size % 256))
    $writer.Write([byte]($image.Size % 256))
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$image.Bytes.Length)
    $writer.Write([uint32]$offset)
    $offset += $image.Bytes.Length
  }
  foreach ($image in $images) { $writer.Write([byte[]]$image.Bytes) }
} finally {
  $writer.Dispose()
  $file.Dispose()
}
[System.IO.File]::Copy($target, (Join-Path $root 'public/plastic-free-favicon.ico'), $true)
[System.IO.File]::Copy((Join-Path $root 'public/favicon.svg'), (Join-Path $root 'public/plastic-free-favicon.svg'), $true)
Write-Output "Generated favicon.ico and iPad-friendly PNG icons from the existing logo."
