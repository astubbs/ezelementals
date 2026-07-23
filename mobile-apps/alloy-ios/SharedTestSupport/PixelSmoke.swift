import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Tiny dependency-free helper for "is this image actually rendered
/// or is it blank?" assertions. Shared between unit-level snapshot
/// tests (AlloyTests/SnapshotSmokeTests) and the UI launch tests
/// (AlloyUITests/AlloyLaunchSmokeTests).
///
/// The whole point of this helper is to defend against the failure
/// mode that XCUITest accessibility queries can't catch: a SwiftUI
/// view hierarchy that exists in the accessibility tree but renders
/// no actual pixels. A truly blank screen has every pixel the same
/// colour and a luminance variance of ~0; any real rendered content
/// has substantial variance.
enum PixelSmoke {

    /// Sane default for "this image isn't blank". Determined
    /// empirically against a known-good Welcome screen capture: a
    /// genuine blank screen sits at variance < 1, the Welcome screen
    /// at variance > 1000. A threshold of 50 gives huge headroom
    /// either way.
    static let defaultMinimumVariance: Double = 50.0

    /// Compute the luminance variance of an image, downsampled to
    /// `samplePoints` random-ish locations. Lower is more uniform;
    /// 0 means every sampled pixel was identical.
    ///
    /// Returns 0 if the image cannot be read for any reason — that
    /// counts as "blank" for the purposes of the smoke check.
    static func variance(of image: UIImage, samplePoints: Int = 4096) -> Double {
        guard let cgImage = image.cgImage else { return 0 }
        let width = cgImage.width
        let height = cgImage.height
        guard width > 0, height > 0 else { return 0 }

        // Render to a known RGBA8 context so we don't have to deal
        // with the source image's colour space or alpha layout.
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo: UInt32 = CGImageAlphaInfo.premultipliedLast.rawValue
        var pixels = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
        guard let context = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo
        ) else { return 0 }
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        // Stride sample so we don't pay for every pixel on a Retina
        // screenshot. samplePoints ~ 4k is plenty for variance.
        let totalPixels = width * height
        let step = max(1, totalPixels / samplePoints)
        var luminances: [Double] = []
        luminances.reserveCapacity(totalPixels / step + 1)
        var i = 0
        while i < totalPixels {
            let base = i * bytesPerPixel
            let r = Double(pixels[base])
            let g = Double(pixels[base + 1])
            let b = Double(pixels[base + 2])
            // Rec. 709 luma — the eye-perceptual brightness.
            let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
            luminances.append(y)
            i += step
        }
        guard !luminances.isEmpty else { return 0 }
        let mean = luminances.reduce(0, +) / Double(luminances.count)
        let squaredDiffs = luminances.map { ($0 - mean) * ($0 - mean) }
        return squaredDiffs.reduce(0, +) / Double(luminances.count)
    }

    /// Convenience wrapper. Returns true if the image's variance is
    /// above the threshold — i.e. it actually contains rendered
    /// content rather than being a single uniform colour.
    static func isNotBlank(_ image: UIImage, threshold: Double = defaultMinimumVariance) -> Bool {
        variance(of: image) > threshold
    }
}
