import XCTest
import SwiftUI
@testable import Alloy

/// Pure-pixel snapshot smoke tests. These render each onboarding
/// screen via SwiftUI's `ImageRenderer` (iOS 16+, no third-party
/// dependency) and assert the resulting image:
///
/// 1. exists,
/// 2. has the expected size,
/// 3. is *visually non-blank* — measured by luminance variance.
///
/// The variance check is the load-bearing assertion. XCUITest queries
/// can pass on a view that exists in the accessibility tree but
/// renders nothing visible; these tests defend against that exact
/// failure mode at unit-test speed without needing the simulator
/// boot at all.
@MainActor
final class SnapshotSmokeTests: XCTestCase {

    private let canvasSize = CGSize(width: 375, height: 812)

    func test_welcomeView_rendersNonBlank() throws {
        let view = WelcomeView(onStart: {})
            .frame(width: canvasSize.width, height: canvasSize.height)
        let image = try render(view)
        assertSize(image)
        assertNonBlank(image)
    }

    func test_discoveryView_rendersNonBlankWithEmptyResults() throws {
        let combiner = DiscoveryCombiner()
        let view = DiscoveryView(
            combiner: combiner,
            onConnectHA: {},
            onContinue: {}
        )
        .frame(width: canvasSize.width, height: canvasSize.height)
        let image = try render(view)
        assertSize(image)
        assertNonBlank(image)
    }

    func test_targetPickerView_rendersNonBlankWithOneRow() throws {
        let combiner = DiscoveryCombiner()
        combiner.ingest(
            DiscoveredAvr(
                id: "t",
                friendlyName: "Living Room AVR",
                modelName: "AVR-X3700H",
                host: "10.0.0.5",
                port: 23,
                sources: [.denonDirect]
            )
        )
        let view = TargetPickerView(combiner: combiner, onSelect: { _ in })
            .frame(width: canvasSize.width, height: canvasSize.height)
        let image = try render(view)
        assertSize(image)
        assertNonBlank(image)
    }

    // MARK: - PixelSmoke self-tests

    /// Sanity-check the variance helper itself. A truly uniform
    /// image must measure as blank; a high-contrast pattern must
    /// not. Without these the snapshot assertions could pass
    /// vacuously if the variance helper had a bug.

    func test_pixelSmoke_uniformImageMeasuresBlank() {
        let blank = solidColorImage(color: .white, size: CGSize(width: 200, height: 200))
        let v = PixelSmoke.variance(of: blank)
        XCTAssertLessThan(v, 1.0, "Uniform white image should have variance ~0, got \(v)")
        XCTAssertFalse(PixelSmoke.isNotBlank(blank))
    }

    func test_pixelSmoke_checkerboardMeasuresVaried() {
        let varied = checkerboardImage(size: CGSize(width: 200, height: 200), tile: 20)
        let v = PixelSmoke.variance(of: varied)
        XCTAssertGreaterThan(v, PixelSmoke.defaultMinimumVariance,
                             "Checkerboard should have high variance, got \(v)")
        XCTAssertTrue(PixelSmoke.isNotBlank(varied))
    }

    // MARK: - Helpers

    private func solidColorImage(color: UIColor, size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            color.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
        }
    }

    private func checkerboardImage(size: CGSize, tile: CGFloat) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            let cols = Int(ceil(size.width / tile))
            let rows = Int(ceil(size.height / tile))
            for r in 0..<rows {
                for c in 0..<cols {
                    let isBlack = (r + c) % 2 == 0
                    (isBlack ? UIColor.black : UIColor.white).setFill()
                    ctx.fill(CGRect(
                        x: CGFloat(c) * tile,
                        y: CGFloat(r) * tile,
                        width: tile,
                        height: tile
                    ))
                }
            }
        }
    }


    private func render<V: View>(_ view: V) throws -> UIImage {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2  // pretend Retina; doesn't affect variance
        let image = try XCTUnwrap(renderer.uiImage, "ImageRenderer produced no image")
        return image
    }

    private func assertSize(_ image: UIImage, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(image.size.width, canvasSize.width, accuracy: 1, file: file, line: line)
        XCTAssertEqual(image.size.height, canvasSize.height, accuracy: 1, file: file, line: line)
    }

    private func assertNonBlank(_ image: UIImage, file: StaticString = #filePath, line: UInt = #line) {
        let v = PixelSmoke.variance(of: image)
        XCTAssertGreaterThan(
            v,
            PixelSmoke.defaultMinimumVariance,
            "Rendered view appears blank (luminance variance \(v) ≤ threshold \(PixelSmoke.defaultMinimumVariance))",
            file: file,
            line: line
        )
    }
}
