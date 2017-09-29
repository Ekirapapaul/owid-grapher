/* LineChart.tsx
 * ================
 *
 * A standard line chart.
 *
 */

import * as React from 'react'
import {last} from './Util'
import {computed, action, observable} from 'mobx'
import {observer} from 'mobx-react'
import ChartConfig from './ChartConfig'
import Bounds from './Bounds'
import AxisBox from './AxisBox'
import StandardAxisBoxView from './StandardAxisBoxView'
import Lines from './Lines'
import HeightedLegend, {HeightedLegendView} from './HeightedLegend'
import {HoverTarget} from './Lines'
import Tooltip from './Tooltip'
import DataKey from './DataKey'
import NoData from './NoData'
import {formatYear} from './Util'
import {select} from 'd3-selection'
import {easeLinear} from 'd3-ease'
import Header from './Header'
import SourcesFooter from './SourcesFooter'
import ControlsFooter from './ControlsFooter'
import DataSelector from './DataSelector'

export interface LineChartValue {
    x: number,
    y: number,
    time: number,
    gapYearsToNext: number
}

export interface LineChartSeries {
    key: string,
    color: string,
    values: LineChartValue[],
    classed?: string,
    isProjection?: boolean,
    formatValue: (value: number) => string
}

@observer
export class LineChartInner extends React.Component<{ bounds: Bounds, chart: ChartConfig }> {
    @computed get chart() { return this.props.chart }
    @computed get bounds() { return this.props.bounds }
    @computed get transform() { return this.props.chart.lineChart }

    // Order of the legend items on a line chart should visually correspond
    // to the order of the lines as the approach the legend
    @computed get legendItems() {
        // Only show projection legends if there are any projections
        // Bit of a hack
        let toShow = this.transform.groupedData
        if (toShow.some(g => !!g.isProjection))
            toShow = this.transform.groupedData.filter(g => g.isProjection)

        return toShow.map(d => ({
            color: d.color,
            key: d.key,
            label: this.chart.data.formatKey(d.key),
            yValue: (last(d.values) as LineChartValue).y
        }))
    }

    @computed get legend(): HeightedLegend|undefined {
        if (this.chart.hideLegend)
            return undefined

        const that = this
        return new HeightedLegend({
            get maxWidth() { return that.bounds.width/3 },
            get items() { return that.legendItems }
        })
    }

    @observable hoverTarget?: HoverTarget
    @action.bound onHoverPoint(target: HoverTarget) {
        this.hoverTarget = target
    }
    @action.bound onHoverStop() {
        this.hoverTarget = undefined
    }

    @computed get focusKeys(): DataKey[] {
        return this.hoverTarget ? [this.hoverTarget.series.key] : this.chart.data.selectedKeys
    }

    @computed get tooltip() {
        const {hoverTarget, chart} = this
        if (hoverTarget == null) return undefined

        return <Tooltip x={hoverTarget.pos.x} y={hoverTarget.pos.y} style={{textAlign: "center"}}>
            <h3 style={{padding: "0.3em 0.9em", margin: 0, backgroundColor: "#fcfcfc", borderBottom: "1px solid #ebebeb", fontWeight: "normal", fontSize: "1em"}}>{chart.data.formatKey(hoverTarget.series.key)}</h3>
            <p style={{margin: 0, padding: "0.3em 0.9em", fontSize: "0.8em"}}>
                <span>{hoverTarget.series.formatValue(hoverTarget.value.y)}</span><br/>
                in<br/>
                <span>{formatYear(hoverTarget.value.x)}</span>
            </p>
        </Tooltip>
    }

    @action.bound onLegendClick(datakey: DataKey) {
        if (this.chart.addCountryMode == 'add-country') 
            this.chart.data.toggleKey(datakey)
    }

    @computed get axisBox() {
        const that = this
        return new AxisBox({
            get bounds() { return that.bounds.padRight(10).padRight(that.legend ? that.legend.width : 0) },
            get yAxis() { return that.transform.yAxis },
            get xAxis() { return that.transform.xAxis }
        })
    }

    base: SVGGElement
    componentDidMount() {
        // Fancy intro animation

        const base = select(this.base)
        base.selectAll("clipPath > rect")
            .attr("width", 0)
            .transition()
                .duration(800)
                .ease(easeLinear)
                .attr("width", this.bounds.width)
                .on("end", () => this.forceUpdate()) // Important in case bounds changes during transition
    }

    render() {
        if (this.transform.failMessage)
            return <NoData bounds={this.props.bounds} message={this.transform.failMessage}/>

        const {chart, transform, bounds, legend, tooltip, focusKeys, axisBox} = this
        const {groupedData} = transform

        return <g className="LineChartInner">
            <defs>
                <clipPath id="boundsClip">
                    <rect x={axisBox.innerBounds.x-10} y={0} width={bounds.width+10} height={bounds.height*2}></rect>
                </clipPath>
            </defs>
            <StandardAxisBoxView axisBox={axisBox} chart={chart}/>
            <g clipPath="url(#boundsClip)">
                {legend && <HeightedLegendView x={bounds.right-legend.width} legend={legend} focusKeys={focusKeys} yScale={axisBox.yScale} onClick={this.onLegendClick}/>}
                <Lines xScale={axisBox.xScale} yScale={axisBox.yScale} data={groupedData} onHoverPoint={this.onHoverPoint} onHoverStop={this.onHoverStop} focusKeys={focusKeys}/>
            </g>
            {/*hoverTarget && <AxisBoxHighlight axisBox={axisBox} value={hoverTarget.value}/>*/}
            {tooltip}
        </g>
    }
}

@observer
export default class LineChartView extends React.Component<{ bounds: Bounds, chart: ChartConfig }> {
    @observable.ref controlsFooterHeight: number = 0

    @computed get svgBounds() {
        return this.props.bounds.padBottom(this.controlsFooterHeight)
    }

    @computed get svgPaddedBounds() {
        return new Bounds(0, 0, this.svgBounds.width, this.svgBounds.height).pad(15)
    }

    @computed get header() {
        const that = this
        return new Header({
            get chart() { return that.props.chart },
            get maxWidth() { return that.svgPaddedBounds.width }
        })
    }

    @computed get footer() {
        const that = this
        return new SourcesFooter({
            get chart() { return that.props.chart },
            get maxWidth() { return that.svgPaddedBounds.width }
        })
    }

    @computed get innerBounds() {
        return this.svgPaddedBounds.padTop(this.header.height+20).padBottom(this.footer.height+15)
    }

    renderSVG() {
        const {props, header, footer, svgBounds, svgPaddedBounds, innerBounds} = this

        const svgStyle = {
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: Bounds.baseFontSize,
            backgroundColor: "white"
        }

        return <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={svgStyle} width={svgBounds.width} height={svgBounds.height}>
            {header.render(svgPaddedBounds.x, svgPaddedBounds.y)}
            <LineChartInner chart={props.chart} bounds={innerBounds}/>
            {footer.render(svgPaddedBounds.x, svgPaddedBounds.bottom-footer.height)}
        </svg>
    }

    base: HTMLDivElement
    componentDidMount() {
        this.componentDidUpdate()
    }
    componentDidUpdate() {
        const controlsFooter = this.base.querySelector(".ControlsFooter")
        if (controlsFooter)
            this.controlsFooterHeight = controlsFooter.getBoundingClientRect().height
    }

    @observable.ref isSelectingData: boolean = false
    @action.bound onDataSelect() {
        this.isSelectingData = true
    }

    @computed get addDataTerm() {
        const {chart} = this.props
        return chart.data.isSingleEntity ? "data" : chart.entityType
    }

    render() {
        const {chart} = this.props

        return <div className="LineChart">
            {this.renderSVG()}
            <ControlsFooter chart={chart}>
                {chart.data.canAddData && <button onClick={this.onDataSelect}>
                    <span><i className="fa fa-plus"/> Add {this.addDataTerm}</span>
                </button>}

                {chart.data.canChangeEntity && <button onClick={this.onDataSelect}>
                    <i className="fa fa-exchange"/> Change {chart.entityType}
                </button>}
            </ControlsFooter>
            {chart.tooltip}
            {this.isSelectingData && <DataSelector chart={chart} onDismiss={action(() => this.isSelectingData = false)}/>}
        </div>
    }
}