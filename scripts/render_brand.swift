#!/usr/bin/env swift

import AppKit
import Foundation

enum Mode: String {
  case logo
  case preview
}

func hexColor(_ hex: String, alpha: CGFloat = 1.0) -> NSColor {
  let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  var value: UInt64 = 0
  Scanner(string: cleaned).scanHexInt64(&value)

  let red = CGFloat((value >> 16) & 0xFF) / 255.0
  let green = CGFloat((value >> 8) & 0xFF) / 255.0
  let blue = CGFloat(value & 0xFF) / 255.0

  return NSColor(red: red, green: green, blue: blue, alpha: alpha)
}

func makeTileGradient() -> NSGradient {
  NSGradient(colors: [
    hexColor("081B2C"),
    hexColor("0B2340"),
    hexColor("05111E"),
  ])!
}

func makeBorderGradient() -> NSGradient {
  NSGradient(colors: [
    hexColor("7BF4FF"),
    hexColor("4F83FF"),
    hexColor("FF9A63"),
  ])!
}

func makeCoolGlowGradient() -> NSGradient {
  NSGradient(colorsAndLocations:
    (hexColor("58EFFF", alpha: 0.34), 0.0),
    (hexColor("58EFFF", alpha: 0.12), 0.35),
    (hexColor("58EFFF", alpha: 0.0), 1.0)
  )!
}

func makeWarmGlowGradient() -> NSGradient {
  NSGradient(colorsAndLocations:
    (hexColor("FF9669", alpha: 0.20), 0.0),
    (hexColor("FF9669", alpha: 0.08), 0.4),
    (hexColor("FF9669", alpha: 0.0), 1.0)
  )!
}

func makeSpotlightGradient() -> NSGradient {
  NSGradient(colorsAndLocations:
    (hexColor("FFF6E8", alpha: 0.80), 0.0),
    (hexColor("FFF3E2", alpha: 0.44), 0.34),
    (hexColor("FFF0DD", alpha: 0.10), 0.62),
    (hexColor("FFF0DD", alpha: 0.0), 1.0)
  )!
}

func savePNG(_ image: NSImage, to url: URL) throws {
  var proposedRect = NSRect(origin: .zero, size: image.size)

  guard
    let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil),
    let png = NSBitmapImageRep(cgImage: cgImage).representation(using: .png, properties: [:])
  else {
    throw NSError(domain: "render_brand", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode PNG"])
  }

  try png.write(to: url)
}

func makeCanvas(size: NSSize) -> (NSImage, NSBitmapImageRep) {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bitmapFormat: [],
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!

  rep.size = size

  let image = NSImage(size: size)
  image.addRepresentation(rep)

  return (image, rep)
}

func roundedPath(_ rect: CGRect, cornerRatio: CGFloat) -> NSBezierPath {
  NSBezierPath(
    roundedRect: rect,
    xRadius: rect.width * cornerRatio,
    yRadius: rect.height * cornerRatio
  )
}

func drawAccentLines(in rect: CGRect) {
  let first = NSBezierPath()
  first.move(
    to: CGPoint(
      x: rect.minX + rect.width * 0.12,
      y: rect.maxY - rect.height * 0.2
    )
  )
  first.line(
    to: CGPoint(
      x: rect.maxX - rect.width * 0.12,
      y: rect.minY + rect.height * 0.18
    )
  )
  hexColor("8EF8FF", alpha: 0.14).setStroke()
  first.lineWidth = max(1.5, rect.width * 0.006)
  first.lineCapStyle = .round
  first.stroke()

  let second = NSBezierPath()
  second.move(
    to: CGPoint(
      x: rect.minX + rect.width * 0.26,
      y: rect.maxY - rect.height * 0.1
    )
  )
  second.line(
    to: CGPoint(
      x: rect.maxX - rect.width * 0.08,
      y: rect.minY + rect.height * 0.28
    )
  )
  hexColor("FF9A63", alpha: 0.10).setStroke()
  second.lineWidth = max(1.25, rect.width * 0.005)
  second.lineCapStyle = .round
  second.stroke()
}

func drawHorse(
  horseRect: CGRect,
  spotlightRect: CGRect,
  horseImage: NSImage
) {
  NSGraphicsContext.saveGraphicsState()
  let spotlightPath = NSBezierPath(ovalIn: spotlightRect)
  spotlightPath.addClip()
  makeSpotlightGradient().draw(in: spotlightRect, relativeCenterPosition: NSPoint(x: 0.0, y: 0.06))
  NSGraphicsContext.restoreGraphicsState()

  let plateRect = horseRect.insetBy(
    dx: horseRect.width * 0.2,
    dy: horseRect.height * 0.2
  ).offsetBy(dx: 0, dy: horseRect.height * 0.018)
  let platePath = NSBezierPath(ovalIn: plateRect)
  hexColor("FFF6EA", alpha: 0.10).setFill()
  platePath.fill()

  hexColor("FFFFFF", alpha: 0.06).setStroke()
  platePath.lineWidth = max(1.2, horseRect.width * 0.006)
  platePath.stroke()

  let halo = NSShadow()
  halo.shadowColor = hexColor("FFF4E6", alpha: 0.94)
  halo.shadowBlurRadius = max(20, horseRect.width * 0.085)
  halo.shadowOffset = .zero

  NSGraphicsContext.saveGraphicsState()
  halo.set()
  horseImage.draw(
    in: horseRect,
    from: .zero,
    operation: .sourceOver,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )
  NSGraphicsContext.restoreGraphicsState()

  let depthShadow = NSShadow()
  depthShadow.shadowColor = hexColor("07162A", alpha: 0.34)
  depthShadow.shadowBlurRadius = max(8, horseRect.width * 0.04)
  depthShadow.shadowOffset = NSSize(width: 0, height: -horseRect.height * 0.012)

  NSGraphicsContext.saveGraphicsState()
  depthShadow.set()
  horseImage.draw(
    in: horseRect,
    from: .zero,
    operation: .sourceOver,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )
  NSGraphicsContext.restoreGraphicsState()

  horseImage.draw(
    in: horseRect,
    from: .zero,
    operation: .sourceOver,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )
}

func drawTile(tileRect: CGRect, horseRect: CGRect, horseImage: NSImage) {
  let outerPath = roundedPath(tileRect, cornerRatio: 0.295)
  makeBorderGradient().draw(in: outerPath, angle: -36)

  let borderInset = max(6, tileRect.width * 0.017)
  let innerRect = tileRect.insetBy(dx: borderInset, dy: borderInset)
  let innerPath = roundedPath(innerRect, cornerRatio: 0.29)

  makeTileGradient().draw(in: innerPath, angle: -38)

  NSGraphicsContext.saveGraphicsState()
  innerPath.addClip()

  makeCoolGlowGradient().draw(
    in: innerRect.insetBy(
      dx: -innerRect.width * 0.16,
      dy: -innerRect.height * 0.12
    ),
    relativeCenterPosition: NSPoint(x: -0.42, y: 0.52)
  )
  makeWarmGlowGradient().draw(
    in: innerRect.insetBy(
      dx: -innerRect.width * 0.1,
      dy: -innerRect.height * 0.08
    ),
    relativeCenterPosition: NSPoint(x: 0.48, y: -0.56)
  )
  drawAccentLines(in: innerRect)

  NSGraphicsContext.restoreGraphicsState()

  hexColor("FFFFFF", alpha: 0.08).setStroke()
  innerPath.lineWidth = max(1.5, tileRect.width * 0.005)
  innerPath.stroke()

  let spotlightRect = horseRect.insetBy(
    dx: -horseRect.width * 0.07,
    dy: -horseRect.height * 0.07
  ).offsetBy(dx: 0, dy: horseRect.height * 0.015)

  drawHorse(horseRect: horseRect, spotlightRect: spotlightRect, horseImage: horseImage)
}

let args = CommandLine.arguments

guard args.count >= 4, let mode = Mode(rawValue: args[1]) else {
  fputs("Usage:\n  render_brand.swift logo <horse-logo.png> <output.png>\n  render_brand.swift preview <horse-logo.png> <base-preview.png> <output.png>\n", stderr)
  exit(1)
}

let horseURL = URL(fileURLWithPath: args[2])
guard let horseImage = NSImage(contentsOf: horseURL) else {
  fputs("Failed to load horse logo: \(horseURL.path)\n", stderr)
  exit(1)
}

switch mode {
case .logo:
  guard args.count == 4 else {
    fputs("logo mode requires: <horse-logo.png> <output.png>\n", stderr)
    exit(1)
  }

  let outputURL = URL(fileURLWithPath: args[3])
  let canvasSize = NSSize(width: 512, height: 512)
  let (image, rep) = makeCanvas(size: canvasSize)
  let context = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context

  NSColor.clear.setFill()
  NSRect(origin: .zero, size: canvasSize).fill()

  drawTile(
    tileRect: CGRect(x: 70, y: 70, width: 372, height: 372),
    horseRect: CGRect(x: 122, y: 122, width: 260, height: 260),
    horseImage: horseImage
  )

  NSGraphicsContext.restoreGraphicsState()
  try savePNG(image, to: outputURL)

case .preview:
  guard args.count == 5 else {
    fputs("preview mode requires: <horse-logo.png> <base-preview.png> <output.png>\n", stderr)
    exit(1)
  }

  let basePreviewURL = URL(fileURLWithPath: args[3])
  let outputURL = URL(fileURLWithPath: args[4])

  guard let basePreview = NSImage(contentsOf: basePreviewURL) else {
    fputs("Failed to load base preview: \(basePreviewURL.path)\n", stderr)
    exit(1)
  }

  let canvasSize = basePreview.size
  let (image, rep) = makeCanvas(size: canvasSize)
  let context = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context

  basePreview.draw(in: NSRect(origin: .zero, size: canvasSize))

  drawTile(
    tileRect: CGRect(x: 748, y: 226, width: 316, height: 316),
    horseRect: CGRect(x: 790, y: 268, width: 232, height: 232),
    horseImage: horseImage
  )

  NSGraphicsContext.restoreGraphicsState()
  try savePNG(image, to: outputURL)
}
