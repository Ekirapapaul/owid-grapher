/* LabelledSlopes.jsx
 * ================
 *
 * Decoupled view component that does the bulk rendering work for slope charts.
 *
 * @project Our World In Data
 * @author  Jaiden Mispy
 * @created 2017-02-11
 */

import * as React from 'react'
import {scaleLinear, scaleLog, scaleOrdinal, ScaleLinear, ScaleLogarithmic, ScaleOrdinal} from 'd3-scale'
import {extent} from 'd3-array'
import {select} from 'd3-selection'
import {every, uniq, first, sortBy, extend, max, isEmpty, throttle} from './Util'
import {observable, computed, action} from 'mobx'
import {observer} from 'mobx-react'

import {SVGElement} from './Util'
import ScaleType from './ScaleType'
import Bounds from './Bounds'
import Text from './Text'
import TextWrap from './TextWrap'
import NoData from './NoData'
import ScaleSelector from './ScaleSelector'
import {getRelativeMouse, domainExtent} from './Util'

export interface SlopeChartValue {
	x: number
	y: number
}

export interface SlopeChartSeries {
	label: string
	key: string
	color: string
	size: number
	values: SlopeChartValue[]
};

interface AxisProps {
	bounds: Bounds
	orient: 'left' | 'right'
	tickFormat: (value: number) => string
	scale: any
	scaleType: ScaleType
};

@observer
class SlopeChartAxis extends React.Component<AxisProps> {
	static calculateBounds(containerBounds: Bounds, props: { tickFormat: (value: number) => string, orient: 'left' | 'right', scale: ScaleLinear<number, number> }) {
		const {scale} = props
		const longestTick = first(sortBy(scale.ticks(6).map(props.tickFormat), tick => -tick.length)) as string
		const axisWidth = Bounds.forText(longestTick).width
		return new Bounds(containerBounds.x, containerBounds.y, axisWidth, containerBounds.height)
	}

	static getTicks(scale: ScaleLinear<number, number>|ScaleLogarithmic<number, number>, scaleType: ScaleType) {
		if (scaleType == 'log') {
			let minPower10 = Math.ceil(Math.log(scale.domain()[0]) / Math.log(10));
			if (!isFinite(minPower10)) minPower10 = 0
			let maxPower10 = Math.floor(Math.log(scale.domain()[1]) / Math.log(10));
			if (maxPower10 <= minPower10) maxPower10 += 1

			var tickValues = [];
			for (var i = minPower10; i <= maxPower10; i++) {
				tickValues.push(Math.pow(10, i));
			}
			return tickValues
		} else {
			return scale.ticks(6)
		}
	}

	props: AxisProps

	@computed get ticks() {
		return SlopeChartAxis.getTicks(this.props.scale, this.props.scaleType)
	}

	render() {
		const {bounds, scale, orient, tickFormat} = this.props
		const {ticks} = this
		const textColor = '#666'

		return <g className="axis" font-size="0.8em">
			{ticks.map(tick => {
				return <text x={orient == 'left' ? bounds.left : bounds.right} y={scale(tick)} fill={textColor} dominant-baseline="middle" text-anchor={orient == 'left' ? 'start' : 'end'}>{tickFormat(tick)}</text>
			})}
	    </g>
	}
}

export interface SlopeProps {
	key: string
	x1: number
	y1: number
	x2: number
	y2: number
	color: string
	size: number
	hasLeftLabel: boolean
	hasRightLabel: boolean
	labelFontSize: string
	leftLabelBounds: Bounds
	rightLabelBounds: Bounds
	leftValueStr: string
	rightValueStr: string
	leftLabel: TextWrap
	rightLabel: TextWrap
	isFocused: boolean
	leftValueWidth: number
	rightValueWidth: number
};

@observer
class Slope extends React.Component<SlopeProps> {
	props: SlopeProps
	line: SVGElement

	render() {
		const { x1, y1, x2, y2, color, size, hasLeftLabel, hasRightLabel, leftValueStr, rightValueStr, leftLabel, rightLabel, labelFontSize, leftLabelBounds, rightLabelBounds, isFocused } = this.props
		const lineColor = color //'#89C9CF'
		const labelColor = '#333'
		const opacity = isFocused ? 1 : 0.5

        const leftValueLabelBounds = Bounds.forText(leftValueStr, { fontSize: labelFontSize })
        const rightValueLabelBounds = Bounds.forText(rightValueStr, { fontSize: labelFontSize })

		return <g className="slope">
			{hasLeftLabel && leftLabel.render(leftLabelBounds.x+leftLabelBounds.width, leftLabelBounds.y, { textAnchor: 'end', fill: labelColor, fontWeight: isFocused ? 'bold' : undefined})}
			{hasLeftLabel && <Text x={x1-8} y={y1-leftValueLabelBounds.height/2} text-anchor="end" fontSize={labelFontSize} fill={labelColor} font-weight={isFocused&&'bold'}>{leftValueStr}</Text>}
			<circle cx={x1} cy={y1} r={isFocused ? 4 : 2} fill={lineColor} opacity={opacity}/>
			<line ref={(el) => this.line = el} x1={x1} y1={y1} x2={x2} y2={y2} stroke={lineColor} stroke-width={isFocused ? 2*size : size} opacity={opacity}/>
			<circle cx={x2} cy={y2} r={isFocused ? 4 : 2} fill={lineColor} opacity={opacity}/>
			{hasRightLabel && <Text x={x2+8} y={y2-rightValueLabelBounds.height/2} dominant-baseline="middle" fontSize={labelFontSize} fill={labelColor} font-weight={isFocused&&'bold'}>{rightValueStr}</Text>}
			{hasRightLabel && rightLabel.render(rightLabelBounds.x, rightLabelBounds.y, { fill: 'labelColor', fontWeight: isFocused ? 'bold' : undefined })}
		</g>
	}
}

export interface LabelledSlopesProps {
	bounds: Bounds
	data: SlopeChartSeries[]
	yDomain: [number|undefined, number|undefined]
	yTickFormat: (value: number) => string
	yScaleType: ScaleType
	yScaleTypeOptions: ScaleType[]
	onScaleTypeChange: (scaleType: ScaleType) => void
}

@observer
export default class LabelledSlopes extends React.Component<LabelledSlopesProps> {
	base: SVGElement
	svg: SVGElement

	@observable focusKey?: string

	@computed get data(): SlopeChartSeries[] {
		return this.props.data
	}

	@computed get yTickFormat(): (value: number) => string {
		return this.props.yTickFormat
	}

	@computed get bounds(): Bounds {
		return this.props.bounds
	}

	@computed get isPortrait(): boolean {
		return this.bounds.width < 400
	}

	@computed get allValues(): SlopeChartValue[] {
		const values: SlopeChartValue[] = []
		this.props.data.forEach(g => values.push(...g.values))
		return values
	}

	@computed get xDomainDefault(): [number, number] {
		return domainExtent(this.allValues.map(v => v.x), 'linear')
	}

	@computed get yDomainDefault(): [number, number] {
		return domainExtent(this.allValues.map(v => v.y), this.props.yScaleType)
	}

	@computed get xDomain(): [number, number] {
		return this.xDomainDefault
	}

	@computed get yDomain(): [number, number] {
		return [
			this.props.yDomain[0] == null ? this.yDomainDefault[0] : this.props.yDomain[0],
		 	this.props.yDomain[1] == null ? this.yDomainDefault[1] : this.props.yDomain[1]
		] as [number, number]
	}

	@computed get sizeScale(): ScaleLinear<number, number> {
		return scaleLinear().domain(extent(this.props.data.map(d => d.size)) as [number, number]).range([1, 4])
	}

	@computed get yScaleConstructor(): Function {
		return this.props.yScaleType == 'log' ? scaleLog : scaleLinear
	}

	@computed get yScale(): ScaleLinear<number, number>|ScaleLogarithmic<number, number> {
		return this.yScaleConstructor().domain(this.yDomain).range(this.props.bounds.padBottom(30).yRange())
	}

	@computed get xScale(): ScaleLinear<number, number> {
		const {bounds, isPortrait, xDomain, yScale} = this
		const padding = isPortrait ? 0 : SlopeChartAxis.calculateBounds(bounds, { orient: 'left', scale: yScale, tickFormat: this.props.yTickFormat }).width
		return scaleLinear().domain(xDomain).range(bounds.padWidth(padding).xRange())
	}

	@computed get colorScale(): ScaleOrdinal<string, string> {
        const colorScheme = [ // TODO less ad hoc color scheme (probably would have to annotate the datasets)
                "#5675c1", // Africa
                "#aec7e8", // Antarctica
                "#d14e5b", // Asia
                "#ffd336", // Europe
                "#4d824b", // North America
                "#a652ba", // Oceania
                "#69c487", // South America
                "#ff7f0e", "#1f77b4", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "c49c94", "e377c2", "f7b6d2", "7f7f7f", "c7c7c7", "bcbd22", "dbdb8d", "17becf", "9edae5", "1f77b4"]

        return scaleOrdinal(colorScheme).domain(uniq(this.props.data.map(d => d.color)))
	}

	@computed get maxLabelWidth(): number {
		return this.bounds.width/5
	}

	@computed get initialSlopeData(): SlopeProps[] {
		const { data, isPortrait, xScale, yScale, sizeScale, yTickFormat, maxLabelWidth } = this

		const slopeData: SlopeProps[] = []
		const yDomain = yScale.domain()

		data.forEach(series => {
			// Ensure values fit inside the chart
			if (!every(series.values, (d) => d.y >= yDomain[0] && d.y <= yDomain[1]))
				return;

			const [ v1, v2 ] = series.values
			const [ x1, x2 ] = [ xScale(v1.x), xScale(v2.x) ]
			const [ y1, y2 ] = [ yScale(v1.y), yScale(v2.y) ]
			const fontSize = (isPortrait ? 0.6 : 0.65)
			const leftValueStr = yTickFormat(v1.y)
			const rightValueStr = yTickFormat(v2.y)
			const leftValueWidth = Bounds.forText(leftValueStr, { fontSize: fontSize+'em' }).width
			const rightValueWidth = Bounds.forText(rightValueStr, { fontSize: fontSize+'em' }).width
			const leftLabel = new TextWrap({ maxWidth: maxLabelWidth, fontSize: fontSize, text: series.label })
			const rightLabel = new TextWrap({ maxWidth: maxLabelWidth, fontSize: fontSize, text: series.label })

			slopeData.push({ x1: x1, y1: y1, x2: x2, y2: y2, color: series.color,
							 size: sizeScale(series.size)||1,
							 leftValueStr: leftValueStr, rightValueStr: rightValueStr,
							 leftValueWidth: leftValueWidth, rightValueWidth: rightValueWidth,
							 leftLabel: leftLabel, rightLabel: rightLabel,
							 labelFontSize: fontSize+'em', key: series.key, isFocused: false,
							 hasLeftLabel: true, hasRightLabel: true } as SlopeProps)
		})

		return slopeData
	}

	@computed get maxValueWidth(): number {
		return max(this.initialSlopeData.map(s => s.leftValueWidth)) as number
	}

	@computed get labelAccountedSlopeData() {
		const {maxLabelWidth, maxValueWidth} = this

		return this.initialSlopeData.map(slope => {
			// Squish slopes to make room for labels
			const x1 = slope.x1+maxLabelWidth+maxValueWidth+8
			const x2 = slope.x2-maxLabelWidth-maxValueWidth-8

			// Position the labels
			const leftLabelBounds = new Bounds(x1-slope.leftValueWidth-12-slope.leftLabel.width, slope.y1-slope.leftLabel.height/2, slope.leftLabel.width, slope.leftLabel.height)
			const rightLabelBounds = new Bounds(x2+slope.rightValueWidth+12, slope.y2-slope.rightLabel.height/2, slope.rightLabel.width, slope.rightLabel.height)

			return extend({}, slope, {
				x1: x1,
				x2: x2,
				leftLabelBounds: leftLabelBounds,
				rightLabelBounds: rightLabelBounds
			})
		})
	}

	// Get the final slope data with hover focusing and collision detection
	@computed get slopeData() : SlopeProps[] {
		const { focusKey } = this
		let slopeData = this.labelAccountedSlopeData

		slopeData = slopeData.map(slope => {
			return extend({}, slope, {
				isFocused: slope.key == focusKey,
			})
		})

		// How to work out which of two slopes to prioritize for labelling conflicts
		function chooseLabel(s1: SlopeProps, s2: SlopeProps) {
			if (s1.isFocused && !s2.isFocused) // Focused slopes always have priority
				return s1
			else if (!s1.isFocused && s2.isFocused)
				return s2
			else if (s1.hasLeftLabel && !s2.hasLeftLabel) // Slopes which already have one label are prioritized for the other side
				return s1
			else if (!s1.hasLeftLabel && s2.hasLeftLabel)
				return s2
			else if (s1.size > s2.size) // Larger sizes get the next priority
				return s1
			else if (s2.size > s1.size)
				return s2
			else
				return s1 // Equal priority, just do the first one
		}

		// Eliminate overlapping labels, one pass for each side
		slopeData.forEach(s1 => {
			slopeData.forEach(s2 => {
				if (s1 !== s2 && s1.hasLeftLabel && s2.hasLeftLabel && s1.leftLabelBounds.intersects(s2.leftLabelBounds)) {
					if (chooseLabel(s1, s2) == s1)
						s2.hasLeftLabel = false
					else
						s1.hasLeftLabel = false
				}
			})
		})

		slopeData.forEach(s1 => {
			slopeData.forEach(s2 => {
				if (s1 !== s2 && s1.hasRightLabel && s2.hasRightLabel && s1.rightLabelBounds.intersects(s2.rightLabelBounds)) {
					if (chooseLabel(s1, s2) == s1)
						s2.hasRightLabel = false
					else
						s1.hasRightLabel = false
				}
			})
		})

		// Order by focus and size for draw order
		slopeData = sortBy(slopeData, (slope) => slope.size)
		slopeData = sortBy(slopeData, (slope) => slope.isFocused ? 1 : 0)

		return slopeData
	}

	@action.bound onMouseMove(ev: React.MouseEvent<SVGGElement>|React.TouchEvent<SVGGElement>) {
		const mouse = getRelativeMouse(this.base, ev)
		
		requestAnimationFrame(() => {
			if (!this.props.bounds.contains(mouse))
				this.focusKey = undefined
			else {
				const slope = sortBy(this.slopeData, (slope) => {
					const distToLine = Math.abs((slope.y2-slope.y1)*mouse.x - (slope.x2-slope.x1)*mouse.y + slope.x2*slope.y1 - slope.y2*slope.x1) / Math.sqrt((slope.y2-slope.y1)**2 + (slope.x2-slope.x1)**2)
					return distToLine
				})[0]
				this.focusKey = slope.key
			}
		})
	}

	componentDidMount() {
		// Nice little intro animation
		select(this.base).select(".slopes").attr('stroke-dasharray', "100%").attr('stroke-dashoffset', "100%").transition().attr('stroke-dashoffset', "0%")
	}
    render() {
    	const { yTickFormat, yScaleType, yScaleTypeOptions, onScaleTypeChange } = this.props
    	const { bounds, slopeData, isPortrait, xDomain, yScale } = this

    	if (isEmpty(slopeData))
    		return <NoData bounds={bounds}/>

    	const {x1, x2} = slopeData[0]
		const [y1, y2] = yScale.range()
		
		const onMouseMove = throttle(this.onMouseMove, 100)

	    return (
	    	<g className="LabelledSlopes" onMouseMove={onMouseMove} onTouchMove={onMouseMove} onTouchStart={onMouseMove} onMouseLeave={onMouseMove}>
				<rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="rgba(0,0,0,0)" opacity={0}/>
				<g className="gridlines">
					{SlopeChartAxis.getTicks(yScale, yScaleType).map(tick => {
						return <line x1={x1} y1={yScale(tick)} x2={x2} y2={yScale(tick)} stroke="#eee" stroke-dasharray="3,2"/>
					})}
				</g>
				{!isPortrait && <SlopeChartAxis orient="left" tickFormat={yTickFormat} scale={yScale} scaleType={yScaleType} bounds={bounds}/>}
	    		{!isPortrait && <SlopeChartAxis orient="right" tickFormat={yTickFormat} scale={yScale} scaleType={yScaleType} bounds={bounds}/>}
	    		<line x1={x1} y1={y1} x2={x1} y2={y2} stroke="#333"/>
	    		<line x1={x2} y1={y1} x2={x2} y2={y2} stroke="#333"/>
	    		{yScaleTypeOptions.length > 1 && <ScaleSelector x={x1+5} y={y2-8} scaleType={yScaleType} scaleTypeOptions={yScaleTypeOptions} onChange={onScaleTypeChange}/>}
	    		<Text x={x1} y={y1+10} textAnchor="middle" fill="#666">{xDomain[0].toString()}</Text>
	    		<Text x={x2} y={y1+10} textAnchor="middle" fill="#666">{xDomain[1].toString()}</Text>
				<g className="slopes">
					{slopeData.map(slope => {
				    	return <Slope key={slope.key} {...slope} />
			    	})}
				</g>
		    </g>
	    );
	}
}
