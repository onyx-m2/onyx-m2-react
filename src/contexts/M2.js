import React, { createContext, useEffect, useContext, useState, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { DBC, NativeTransport, WebSocketTransport } from 'onyx-m2-common'

export const M2 = createContext()

/**
 * Context provider for the M2, which must be present in the render tree above the
 * App component.
 * @param {*} props
 */
export function M2Provider(props) {
  const { config, dbcFile, children } = props

  const { dbc, transport } = useMemo(() => {
    const dbc = new DBC(dbcFile)
    let transport
    if (global.M2) {
      console.info('M2 interface detected, using native transport')
      transport = new NativeTransport(dbc)
    } else {
      console.info('Using web socket transport')
      transport = new WebSocketTransport()
    }
    return { dbc, transport }
  }, [])

  useEffect(() => {
    transport.connect(config)
  }, [config.server])

  return (
    <M2.Provider value={{ transport, dbc }}>
      {children}
    </M2.Provider>
  )
}

/**
 * Ping pong state hook to prevent idle disconnects, detect unresponsive web sockets,
 * and calculate latency. A message level ping/pong mechanism is required because
 * browsers don't let us implement it at the protocol level.
 * @param {Number} frequency Interval, in milliseconds, at which to ping the server
 * @param {Number} timeout Amount of time, in milliseconds, to allow server to respond
 * to ping with a pong
 */
export function usePingPongState(frequency, timeout) {
  const { transport } = useContext(M2)
  const [ latency, setLatency ] = useState(0)
  const [ connected, setConnected ] = useState(false)

  useEffect(() => {
    let at = 0

    let previousCheck = Date.now() // guard against the browser being backgrounded
    const intervalId = setInterval(() => {
      const now = Date.now()
      if (at !== 0 && ((now - previousCheck) > (2 * frequency))) {
        if (now - at >= timeout) {
          setConnected(false)
          at = 0
          transport.reconnect()
        }
      }
      else {
        at = now
        transport.send('ping')
      }
      previousCheck = now
    }, frequency)

    function handlePong() {
      setConnected(true)
      setLatency(Date.now() - at)
      at = 0
    }
    transport.addEventListener('pong', handlePong)

    return () => {
      transport.removeEventListener('pong', handlePong)
      clearInterval(intervalId)
    }
  }, [transport, frequency, timeout])

  return [ connected, latency ]
}

/**
 * Status protocol implementation that tracks the M2's online status and latency
 * between itself and the server.
 */
export function useStatusState(options) {
  const { transport } = useContext(M2)
  const [ online, setOnline ] = useState(false)
  const [ ignoreOnlineStatus, setIgnoreOnlineStatus ] = useState(false)
  const [ latency, setLatency ] = useState(0)
  const [ rate, setRate ] = useState(0)

  useHotkeys(options?.forceOnlineKey, () => {
    setIgnoreOnlineStatus(true)
    setOnline(true)
  })

  useHotkeys(options?.forceOfflineKey, () => {
    setIgnoreOnlineStatus(true)
    setOnline(false)
  })

  useEffect(() => {
    function handleStatus({ detail: [ online, latency, rate ] }) {
      if (!ignoreOnlineStatus) {
        setOnline(online)
      }
      setLatency(latency)
      setRate(rate)
    }
    transport.addEventListener('status', handleStatus)
    return () => transport.removeEventListener('status', handleStatus)
  }, [transport, ignoreOnlineStatus])

  return [ online, latency, rate ]
}
