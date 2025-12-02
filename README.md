# Instrument Build & Test Pipeline Simulator

Toy Python simulator for an electro-mechanical **instrument build + test pipeline**.  
The pipeline is defined in a YAML configuration file, and the simulator runs Monte-Carlo style simulations of many units flowing through the stages, reporting yield and cycle-time metrics.

The goal is to illustrate how you can reason about build/test flows, stage yields, and process improvements for complex instruments.

> This is a generic demo — all numbers and stages are synthetic and not tied to any specific product.

---

## Features

- Define a pipeline of build and test stages in a YAML file.
- Simulate many units moving through stages with configurable failure probabilities.
- Report:
  - per-stage yield,
  - overall yield,
  - average cycle time per unit.
- Jupyter notebooks for:
  - visualizing the pipeline,
  - exploring what-if scenarios (e.g., improved tests, higher/lower failure rates).

---

## Repository structure

```text
instrument-build-test-sim/
  README.md
  requirements.txt
  config/
    instrument_pipeline.yaml
  src/
    pipeline_sim/
      __init__.py
      models.py       # Stage, Pipeline, SimulationSettings, SimulationResult
      simulator.py    # core simulation logic
      reporting.py    # tables/plots for yield & cycle time
  notebooks/
    01_pipeline_overview.ipynb
    02_yield_and_cycle_time_scenarios.ipynb
  tests/
    test_simulator.py
Tech stack
Python 3.10+

pyyaml

numpy, pandas

matplotlib, seaborn

pytest

Jupyter

Getting started
1. Clone the repo
bash
Copy code
git clone https://github.com/bbell1618/instrument-build-test-sim.git
cd instrument-build-test-sim
2. Create & activate a virtual environment (optional)
bash
Copy code
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# or
.\.venv\Scripts\activate       # Windows
3. Install dependencies
bash
Copy code
pip install -r requirements.txt
Running a simulation
From the repo root:

bash
Copy code
python -m pipeline_sim.simulator
The default run will:

load the pipeline defined in config/instrument_pipeline.yaml,

simulate a number of units,

print summary statistics to the console.

To explore in more detail, start Jupyter:

bash
Copy code
jupyter lab   # or jupyter notebook
and open:

notebooks/01_pipeline_overview.ipynb

notebooks/02_yield_and_cycle_time_scenarios.ipynb

These notebooks show the pipeline structure, simulate multiple scenarios, and visualize yields and cycle times with charts.

Customizing the pipeline
The YAML file config/instrument_pipeline.yaml describes the stages. Each stage includes fields like:

name

mean_duration_minutes

failure_probability

You can duplicate and modify this file to experiment with:

adding or removing stages,

changing failure rates,

simulating rework loops, etc.

Disclaimer
This simulator is intentionally simplified. It’s intended as a learning and discussion tool for thinking about build/test flows and trade-offs in test coverage, yield, and throughput for complex instruments.
