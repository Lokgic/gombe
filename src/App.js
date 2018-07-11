import React, { Component } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { interval } from "d3-timer";
import { pie as d3Pie, arc as d3Arc } from "d3-shape";
import data from "./data.json";
import gombe from "./gombe.json";
import { scaleLinear } from "d3-scale";
import _ from "lodash";

const m = _.filter(
  data.reduce((acc, d) => [...acc, d.total_kk, d.total_mt], []),
  d => d !== "NA"
);
const totalRange = scaleLinear()
  .domain([Math.min(...m), Math.max(...m)])
  .range([10, 50]);

const reader = row => {
  const group = ["kk", "mt"];
  const out = group.map(name => {
    const longlat = [
      parseFloat(row["long_" + name]),
      parseFloat(row["lat_" + name])
    ];
    return {
      name,
      longlat,
      sex: row["focal_sex_" + name],
      age: row["focal_age_" + name],
      population: [
        { type: "male", n: row["adult_m_" + name] },
        { type: "female", n: row["adult_f_" + name] },
        {
          type: "child",
          n:
            row["total_" + name] -
            row["adult_m_" + name] -
            row["adult_f_" + name]
        }
      ],
      lat: row["lat_" + name],
      long: row["long_" + name],
      total: row["total_" + name]
    };
  });
  return out;
};

const color = ["#98abc5", "#d89b95", "#ff8c00"];

class App extends Component {
  constructor(props) {
    super(props);
    this.projection = geoMercator()
      .center([29.65, -4.65])
      .scale(400000);
    this.geoGenerator = geoPath().projection(this.projection);
    this.pathData = this.geoGenerator(gombe);
    this.state = { frame: 11, play: false };
    this.handleSlider = this.handleSlider.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    const row = reader(data[11]);
    this.coord = row.map(d => this.projection(d.longlat));
    this.pie = d3Pie()
      .sort(null)
      .value(d => d.n);
  }
  handleSlider(e) {
    const playing = this.state.play;
    this.setState({ frame: parseInt(e.target.value) });
    if (playing) {
      this.timer.stop();
      this.setState({ play: false });
    }
  }
  handlePlay() {
    const playing = this.state.play;
    if (playing) {
      this.timer.stop();
      this.setState({ play: false });
    } else {
      this.timer = interval(elapsed => {
        const next =
          this.state.frame + 1 >= data.length ? 0 : this.state.frame + 1;
        this.setState({ frame: next });
      }, 20);
      this.setState({ play: true });
    }
  }

  render() {
    const { frame, play } = this.state;
    const { projection } = this;
    const row = reader(data[frame]);
    console.log(row);
    const coord = row.map(
      (d, i) =>
        d.lat === "NA" || d.long === "NA"
          ? this.coord[i]
          : projection(d.longlat)
    );
    this.coord = coord;

    const pieData = row.map(d => this.pie(d.population));

    const arcGen = row.map(d =>
      d3Arc()
        .outerRadius(totalRange(d.total))
        .innerRadius(0)
    );
    const pathData = pieData.map((d, i) => d.map(k => arcGen[i](k)));
    // console.log(path(j[0]));

    return (
      <div>
        <input
          type="range"
          min="0"
          max={data.length - 1}
          value={frame}
          onChange={this.handleSlider}
          style={{ width: "80%" }}
        />
        <button onClick={this.handlePlay}>{play ? "Pause" : "Play"}</button>
        <svg width="800" height="1200">
          <text x="10" y="20">
            time: {data[this.state.frame].time}
          </text>
          <path d={this.pathData} fill="grey" />
          {coord.map((d, i) => (
            // <circle
            //   cx={d[0]}
            //   cy={d[1]}
            //   r={totalRange(row[i].total)}
            //   key={`circle_${i}`}
            // />
            <g key={i + "g"} transform={`translate(${d[0]},${d[1]})`}>
              {pathData[i].map((k, j) => (
                <path key={"arc" + k + j} d={k} fill={color[j]} />
              ))}
            </g>
          ))}
        </svg>
      </div>
    );
  }
}

export default App;
