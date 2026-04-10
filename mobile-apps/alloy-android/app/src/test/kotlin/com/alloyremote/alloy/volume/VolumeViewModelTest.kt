package com.alloyremote.alloy.volume

import com.alloyremote.alloy.model.ConnectionState
import com.alloyremote.alloy.model.VolumeRange
import com.alloyremote.alloy.target.VolumeTarget
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class VolumeViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `drag updates intent locally without awaiting network`() = runTest(dispatcher) {
        val spy = SpyTarget()
        val model = VolumeViewModel(spy)
        advanceUntilIdle()

        model.onDragStart()
        model.onDragChange(42)
        assertEquals(42, model.intent.value)
    }

    @Test
    fun `rapid drag coalesces sends`() = runTest(dispatcher) {
        val spy = SpyTarget()
        val model = VolumeViewModel(spy)
        advanceUntilIdle()

        model.onDragStart()
        for (v in 30..40) model.onDragChange(v)
        advanceTimeBy(150)
        advanceUntilIdle()
        // Expect at most one throttled send during the rapid drag.
        assertEquals(true, spy.setVolumeCalls.size <= 2)
    }

    @Test
    fun `drag end always sends final value`() = runTest(dispatcher) {
        val spy = SpyTarget()
        val model = VolumeViewModel(spy)
        advanceUntilIdle()

        model.onDragStart()
        model.onDragChange(55)
        model.onDragEnd()
        advanceUntilIdle()
        assertEquals(55, spy.setVolumeCalls.last())
    }

    @Test
    fun `confirmed stream does not overwrite intent while dragging`() = runTest(dispatcher) {
        val spy = SpyTarget()
        val model = VolumeViewModel(spy)
        advanceUntilIdle()

        model.onDragStart()
        model.onDragChange(70)
        spy.emitConfirmed(30)
        advanceUntilIdle()

        assertEquals(70, model.intent.value)
        assertEquals(30, model.confirmed.value)
    }

    @Test
    fun `confirmed stream aligns intent when idle`() = runTest(dispatcher) {
        val spy = SpyTarget()
        val model = VolumeViewModel(spy)
        advanceUntilIdle()

        spy.emitConfirmed(42)
        advanceUntilIdle()

        assertEquals(42, model.intent.value)
        assertEquals(42, model.confirmed.value)
    }
}

private class SpyTarget : VolumeTarget {
    override val volumeRange: VolumeRange = VolumeRange.denonDefault

    val setVolumeCalls = mutableListOf<Int>()

    private val _confirmed = MutableSharedFlow<Int>(extraBufferCapacity = 16)
    private val _state = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)

    override suspend fun connect() {}
    override suspend fun disconnect() {}
    override suspend fun setVolume(intent: Int) { setVolumeCalls.add(intent) }
    override fun confirmedFlow(): Flow<Int> = _confirmed.asSharedFlow()
    override fun connectionFlow(): Flow<ConnectionState> = _state.asStateFlow()

    suspend fun emitConfirmed(value: Int) { _confirmed.emit(value) }
}
