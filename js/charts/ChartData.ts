import * as _ from 'lodash'
import ChartType from './ChartType'
import {observable, computed, autorun, action} from 'mobx'
import ChartConfig, {ChartDimension} from './ChartConfig'
import VariableData, {Variable} from './VariableData'
import DataKey from './DataKey'
import {bind} from 'decko'
import {LineChartSeries} from './LineChart'
import Color from './Color'
import {formatValue} from './Util'

export interface DataKeyInfo {
	entity: string 
	entityId: number
	dimension: DimensionWithData
	index: number 
	key: string
	fullLabel: string
	label: string 
	shortCode: string
}

export interface SourceWithVariable {
	name: string,
	description: string,
	variable: Variable
}


export class DimensionWithData {
	@observable.ref index: number
	@observable.ref dimension: ChartDimension
	@observable.ref variable: Variable

	@computed get property(): string {
		return this.dimension.property
	}

	@computed get name(): string {
		return this.dimension.displayName || this.variable.name
	}

	@computed get isProjection(): boolean {
		return !!this.dimension.isProjection
	}

	@computed get targetYear(): number|undefined {
		return this.dimension.targetYear
	}

	@computed get tolerance(): number {
		return this.dimension.tolerance||0
	}

	@computed get formatValueShort(): (value: number) => string {
		return value => formatValue(value, { unit: this.variable.shortUnit })
	}

	@computed get formatValueLong(): (value: number) => string {
		return value => formatValue(value, { unit: this.variable.unit })
	}

    constructor(index: number, dimension: ChartDimension, variable: Variable) {
		this.index = index
        this.dimension = dimension
		this.variable = variable
    }
}

export default class ChartData {
	chart: ChartConfig

	constructor(chart: ChartConfig) {
		this.chart = chart
	}

	@computed get vardata() {
		return this.chart.vardata
	}

	// ChartData is ready to go iff we have retrieved data for every variable associated with the chart
	@computed get isReady(): boolean {
		const {chart, vardata} = this
		return _.every(chart.dimensions, dim => vardata.variablesById[dim.variableId])
	}

	@computed get filledDimensions(): DimensionWithData[] {
		if (!this.isReady) return []
		
        return _.map(this.chart.dimensions, (dim, i) => {
            const variable = this.vardata.variablesById[dim.variableId]
			return new DimensionWithData(i, dim, variable)
        })
    }

	@computed get primaryDimensions() {
		return this.filledDimensions.filter(dim => dim.property == 'y')        
    }

	@computed get isSingleEntity(): boolean {
		return this.vardata.availableEntities.length == 1 || this.chart.addCountryMode != 'add-country'
	}

	@computed get isSingleVariable(): boolean {
		return this.primaryDimensions.length == 1
	}

	// Make a unique string key for an entity on a variable
	keyFor(entity: string, dimensionIndex: number): DataKey {
		return `${entity}_${dimensionIndex}`
	}

	@computed get dimensionsByField(): _.Dictionary<DimensionWithData> {
		return _.keyBy(this.filledDimensions, 'property')
	}

	@computed get selectionData(): { key: DataKey, color?: Color }[] {
		const {chart, vardata, primaryDimensions} = this
		const validSelections = _.filter(chart.props.selectedData, sel => {
			// Must be a dimension that's on the chart
			const dimension = primaryDimensions[sel.index]
			if (dimension == null) return false
			
			// Entity must be within that dimension
			const entityMeta = vardata.entityMetaById[sel.entityId]
			if (entityMeta == null || !_.includes(dimension.variable.entitiesUniq, entityMeta.name)) return false

			return true
		})
		return _.map(validSelections, sel => {
			return {
				key: this.keyFor(vardata.entityMetaById[sel.entityId].name, sel.index),
				color: sel.color
			}
		})
	}

	@computed get selectedKeys(): DataKey[] {
		return this.selectionData.map(d => d.key)
	}

	@computed.struct get keyColors(): {[datakey: string]: Color|undefined}{
		const keyColors: {[datakey: string]: Color|undefined} = {}
		this.selectionData.forEach(d => {
			if (d.color)
				keyColors[d.key] = d.color
		})
		return keyColors
	}

	setKeyColor(datakey: DataKey, color: Color|undefined) {
		const meta = this.lookupKey(datakey)
		const selectedData = _.cloneDeep(this.chart.props.selectedData)
		selectedData.forEach(d => {
			if (d.entityId == meta.entityId && d.index == meta.index) {
				d.color = color
			}
		})
		this.chart.props.selectedData = selectedData
	}

	@computed get selectedEntities(): string[] {
		return _(this.selectedKeys).map(key => this.lookupKey(key).entity).uniq().value()
	}

	@computed get availableEntities(): string[] {
		return _(this.availableKeys).map(key => this.lookupKey(key).entity).uniq().value()
	}

	switchEntity(entityId: number) {
        const selectedData = _.cloneDeep(this.chart.props.selectedData)
        selectedData.forEach(d => d.entityId = entityId)
        this.chart.props.selectedData = selectedData		
	}

	// Map keys back to their components for storage
	set selectedKeys(keys: DataKey[]) {
		const {chart, vardata} = this
		if (!this.isReady) return

		const selection = _.map(keys, datakey => {
			const {entity, index} = this.lookupKey(datakey)
			return {
				entityId: vardata.entityMetaByKey[entity].id,
				index: index,
				color: this.keyColors[datakey]
			}
		})
		chart.props.selectedData = selection
	}

	@computed get selectedKeysByKey(): _.Dictionary<DataKey> {
		return _.keyBy(this.selectedKeys)
	}

	// Calculate the available datakeys and their associated info
	@computed get keyData(): Map<DataKey, DataKeyInfo> {
		if (!this.isReady) return new Map()
		const {chart, vardata, isSingleEntity, isSingleVariable, primaryDimensions} = this
	
		const keyData = new Map()
		_.each(primaryDimensions, (dim, index) => {
			const {variable} = dim
			_.each(variable.entitiesUniq, entity => {
				const entityMeta = chart.vardata.entityMetaByKey[entity]
				const key = this.keyFor(entity, index)

				// Full label completely represents the data in the key and is used in the editor
				const fullLabel = `${entity} - ${dim.name}`

				// The output label however is context-dependent
				let label = fullLabel
				if (isSingleVariable) {
					label = entity
				} else if (isSingleEntity) {
					label = `${dim.name}`
				}

				keyData.set(key, {
					key: key,
					entityId: entityMeta.id,
					entity: entity,
					dimension: dim,
					index: index,
					fullLabel: fullLabel,
					label: label,
					shortCode: (primaryDimensions.length > 1 && chart.addCountryMode != "change-country") ? `${entityMeta.code||entityMeta.name}-${dim.index}` : (entityMeta.code||entityMeta.name)
				})
			})
		})

		return keyData
	}

	@computed get canAddData(): boolean {
		return this.chart.addCountryMode == "add-country" && this.availableKeys.length > 1
	}

	@computed get canChangeEntity(): boolean {
		return !this.chart.isScatter && this.chart.addCountryMode == "change-country" && this.availableEntities.length > 1
	}

	@computed.struct get availableKeys(): DataKey[] {
		return _.sortBy([...this.keyData.keys()])
	}

	@computed.struct get remainingKeys(): DataKey[] {
		const {chart, availableKeys, selectedKeys} = this
		return _.without(availableKeys, ...selectedKeys)
	}

	@computed get availableKeysByEntity(): Map<string, DataKey[]> {
		const keysByEntity = new Map()
		this.keyData.forEach((info, key) => {
			const keys = keysByEntity.get(info.entity) || []
			keys.push(key)
			keysByEntity.set(info.entity, keys)
		})
		return keysByEntity
	}

	lookupKey(key: DataKey) {
		const keyDatum = this.keyData.get(key)
		if (keyDatum !== undefined)
			return keyDatum
		else
			throw new Error(`Unknown data key: ${key}`)		
	}

	formatKey(key: DataKey): string {
		return this.lookupKey(key).label
	}

	toggleKey(key: DataKey) {
		if (_.includes(this.selectedKeys, key)) {
			this.selectedKeys = this.selectedKeys.filter(k => k != key)
		} else {
			this.selectedKeys = this.selectedKeys.concat([key])
		}
	}

	@computed get primaryVariable() {
		const yDimension = _.find(this.chart.dimensions, { property: 'y' })
		return yDimension ? this.vardata.variablesById[yDimension.variableId] : undefined
	}

	@computed get sources(): SourceWithVariable[] {
		const {chart, vardata, filledDimensions} = this
		const {variablesById} = vardata

		let sources: SourceWithVariable[] = []
		_.each(filledDimensions, (dim) => {
			const {variable} = dim
			// HACK (Mispy): Ignore the default color source on scatterplots.
			if (variable.name != "Countries Continents" && variable.name != "Total population (Gapminder)")
				sources.push(_.extend({}, variable.source, { variable: variable }))
		});
		return sources
	}
}
