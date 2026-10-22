Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
[xml]$logo = Get-Content -Raw -LiteralPath (Join-Path $root 'public/favicon.svg')
$background = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.rect.fill)
$leaf = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.path[0].fill)
$stem = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.path[1].stroke)
$dot = [System.Drawing.ColorTranslator]::FromHtml($logo.svg.circle.fill)
$images = New-Object System.Collections.Generic.List[object]

foreach ($size in @(16, 32, 48, 64, 128, 256)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.ScaleTransform($size / 64.0, $size / 64.0)
  $rectangle = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $rectangle.AddArc(0, 0, 30, 30, 180, 90)
  $rectangle.AddArc(34, 0, 30, 30, 270, 90)
  $rectangle.AddArc(34, 34, 30, 30, 0, 90)
  $rectangle.AddArc(0, 34, 30, 30, 90, 90)
  $rectangle.CloseFigure()
  $backgroundBrush = [System.Drawing.SolidBrush]::new($background)
  $graphics.FillPath($backgroundBrush, $rectangle)

  $leafPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $leafPath.StartFigure()
  $leafPath.AddBezier(49, 13, 31, 13, 17, 20, 15, 35)
  $leafPath.AddBezier(15, 35, 14, 44, 19, 50, 28, 50)
  $leafPath.AddBezier(28, 50, 43, 50, 49, 32, 49, 13)
  $leafPath.CloseFigure()
  $leafBrush = [System.Drawing.SolidBrush]::new($leaf)
  $graphics.FillPath($leafBrush, $leafPath)

  $stemPen = [System.Drawing.Pen]::new($stem, 4)
  $stemPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stemPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawBezier($stemPen, 16, 49, 24, 39, 32, 33, 43, 26)
  $dotBrush = [System.Drawing.SolidBrush]::new($dot)
  $graphics.FillEllipse($dotBrush, 44, 43, 10, 10)

  $stream = [System.IO.MemoryStream]::new()
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $images.Add([pscustomobject]@{ Size = $size; Bytes = $stream.ToArray() })
  $stream.Dispose()
  $dotBrush.Dispose()
  $stemPen.Dispose()
  $leafBrush.Dispose()
  $leafPath.Dispose()
  $backgroundBrush.Dispose()
  $rectangle.Dispose()
  $graphics.Dispose()
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
Write-Output "Generated $target from the existing logo."
