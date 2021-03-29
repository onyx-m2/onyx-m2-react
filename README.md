# Onyx M2 React Library

This is part of the [Onyx M2 Project](https://github.com/onyx-m2), which enables
read-only real-time access to the Tesla Model 3/Y CAN bus data, including the
ability to run apps on the car's main screen through its built in web browser.

This library exposes functionality meant to be used by client React based apps.
It exposed React contexts that can be used in the render tree to provide real-time
access to the parsed CAN bus signals.

The exported contexts are
- [M2](#M2)
- [SignalContext](#SignalContext)
- [ConsumptionContext](#ConsumptionContext)


# Installation

The library is available on NPM, so installation is simply:
```
  npm i onyx-m2-react
```

**NOTE: Documentation is forthcoming...**