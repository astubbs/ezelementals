import XCTest
@testable import Alloy

final class DenonCommandTests: XCTestCase {

    // MARK: - Encoding

    func test_setWhole_producesZeroPaddedMVCommand() {
        XCTAssertEqual(DenonCommand.set(whole: 50), "MV50\r")
        XCTAssertEqual(DenonCommand.set(whole: 5), "MV05\r")
        XCTAssertEqual(DenonCommand.set(whole: 0), "MV00\r")
    }

    func test_setWhole_clampsOutOfRange() {
        XCTAssertEqual(DenonCommand.set(whole: -10), "MV00\r")
        XCTAssertEqual(DenonCommand.set(whole: 200), "MV99\r")
    }

    func test_setHalf_encodesHalfStepAsThreeDigits() {
        XCTAssertEqual(DenonCommand.set(half: 50.5), "MV505\r")
        XCTAssertEqual(DenonCommand.set(half: 5.5), "MV055\r")
    }

    func test_setHalf_roundsWholeValues() {
        XCTAssertEqual(DenonCommand.set(half: 50.0), "MV50\r")
    }

    func test_query_isMVQuestionMark() {
        XCTAssertEqual(DenonCommand.query(), "MV?\r")
    }

    // MARK: - Decoding

    func test_parse_volumeReading() {
        XCTAssertEqual(DenonCommand.parse("MV50"), .volume(50))
        XCTAssertEqual(DenonCommand.parse("MV05"), .volume(5))
    }

    func test_parse_halfStepVolumeReadsAsWhole() {
        // Half-steps are truncated to the integer intent model in M1.
        XCTAssertEqual(DenonCommand.parse("MV505"), .volume(50))
    }

    func test_parse_maxVolume() {
        XCTAssertEqual(DenonCommand.parse("MVMAX 80"), .max(80))
    }

    func test_parse_unknownLineBecomesOther() {
        guard case .other = DenonCommand.parse("SITV ON") else {
            XCTFail("Expected .other for unknown line")
            return
        }
    }
}
