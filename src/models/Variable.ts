/*import {Table, Column, Model} from 'sequelize-typescript'

@Table({ tableName: 'variables' })
export default class Variable extends Model<Variable> {
    @Column name!: string
    @Column unit!: string
    @Column description!: string
}*/

import db from '../db'
import * as _ from 'lodash'

export async function getVariableData(variableIds: number[]): Promise<any> {
    const data: any = { variables: {}, entityKey: {} }

    const variableQuery = db.query(`
        SELECT v.*, v.short_unit as shortUnit, d.name as datasetName, s.id as s_id, s.name as s_name, s.description as s_description FROM variables as v
            JOIN datasets as d ON v.datasetId = d.id
            JOIN sources as s on v.sourceId = s.id
            WHERE v.id IN (?)
    `, [variableIds])

    const dataQuery = db.query(`
            SELECT value, year, variableId as variableId, entities.id as entityId,
            entities.name as entityName, entities.code as entityCode
            FROM data_values
            LEFT JOIN entities ON data_values.entityId = entities.id
            WHERE data_values.variableId IN (?)
            ORDER BY variableId ASC, year ASC
    `, [variableIds])

    const variables = await variableQuery

    for (const row of variables) {
        row.shortUnit = row.short_unit; delete row.short_unit
        row.display = JSON.parse(row.display)
        const sourceDescription = JSON.parse(row.s_description); delete row.s_description
        row.source = {
            id: row.s_id,
            name: row.s_name,
            dataPublishedBy: sourceDescription.dataPublishedBy || "",
            dataPublisherSource: sourceDescription.dataPublisherSource || "",
            link: sourceDescription.link || "",
            retrievedData: sourceDescription.retrievedData || "",
            additionalInfo: sourceDescription.additionalInfo || ""
        }
        data.variables[row.id] = _.extend({
            years: [],
            entities: [],
            values: []
        }, row)
    }

    const results = await dataQuery

    for (const row of results) {
        const variable = data.variables[row.variableId]
        variable.years.push(row.year)
        variable.entities.push(row.entityId)


        const asNumber = parseFloat(row.value)
        if (!isNaN(asNumber))
            variable.values.push(asNumber)
        else
            variable.values.push(row.value)

        if (data.entityKey[row.entityId] === undefined) {
            data.entityKey[row.entityId] = { name: row.entityName, code: row.entityCode }
        }
    }

    return data
}
