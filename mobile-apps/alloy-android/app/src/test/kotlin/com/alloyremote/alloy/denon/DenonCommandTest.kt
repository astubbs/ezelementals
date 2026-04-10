package com.alloyremote.alloy.denon

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DenonCommandTest {

    // MARK: - Encoding

    @Test
    fun `setWhole produces zero-padded MV command`() {
        assertEquals("MV50\r", DenonCommand.setWhole(50))
        assertEquals("MV05\r", DenonCommand.setWhole(5))
        assertEquals("MV00\r", DenonCommand.setWhole(0))
    }

    @Test
    fun `setWhole clamps out-of-range values`() {
        assertEquals("MV00\r", DenonCommand.setWhole(-10))
        assertEquals("MV99\r", DenonCommand.setWhole(200))
    }

    @Test
    fun `setHalf encodes half-step as three digits`() {
        assertEquals("MV505\r", DenonCommand.setHalf(50.5))
        assertEquals("MV055\r", DenonCommand.setHalf(5.5))
    }

    @Test
    fun `setHalf rounds whole values`() {
        assertEquals("MV50\r", DenonCommand.setHalf(50.0))
    }

    @Test
    fun `query is MV question mark`() {
        assertEquals("MV?\r", DenonCommand.query())
    }

    // MARK: - Decoding

    @Test
    fun `parse volume reading`() {
        assertEquals(DenonCommand.ParsedResponse.Volume(50), DenonCommand.parse("MV50"))
        assertEquals(DenonCommand.ParsedResponse.Volume(5), DenonCommand.parse("MV05"))
    }

    @Test
    fun `half-step volume truncates to whole integer`() {
        assertEquals(DenonCommand.ParsedResponse.Volume(50), DenonCommand.parse("MV505"))
    }

    @Test
    fun `parse MVMAX`() {
        assertEquals(DenonCommand.ParsedResponse.Max(80), DenonCommand.parse("MVMAX 80"))
    }

    @Test
    fun `unknown line becomes Other`() {
        assertTrue(DenonCommand.parse("SITV ON") is DenonCommand.ParsedResponse.Other)
    }
}
