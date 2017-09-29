/* ChartEditor.ts
 * ================
 *
 * Mobx store that represents the current editor state and governs non-UI-related operations.
 *
 */

import {observable, computed, reaction} from 'mobx'
import {extend, toString, uniq} from '../charts/Util'
import ChartConfig from '../charts/ChartConfig'
import ChartType from '../charts/ChartType'
import EditorFeatures from './EditorFeatures'
import Admin from './Admin'
import * as $ from 'jquery'

declare const Global: any

export interface ChartEditorProps {
    chart: ChartConfig
	cacheTag: string
}

export type EditorTab = string

export interface Variable {
	id: number
	name: string
}

export interface Dataset {
	name: string
	namespace: string
	variables: Variable[]
}

// This contains the dataset/variable metadata for the entire database
// Used for variable selector interface
export class EditorDatabase {
	@observable.ref datasets: Dataset[]

	@computed get namespaces(): string[] {
		return uniq(this.datasets.map(d => d.namespace))
	}

	constructor(json: any) {
		this.datasets = json.datasets
	}
}

export default class ChartEditor {
    @observable.ref chart: ChartConfig
	// Since the database metadata is quite large, we only fetch it when it is needed
	// and then store it here
	@observable.ref database: EditorDatabase

    // Whether the current chart state is saved or not
    @observable.ref isSaved: boolean = true
	@observable.ref currentRequest: Promise<any>|undefined

	@observable.ref tab: EditorTab = 'basic'

	@computed get availableTabs(): EditorTab[] {
		if (!this.chart.primaryTransform.isValidConfig) {
			return ['basic']
		} else {
			const tabs: EditorTab[] = ['basic', 'data', 'text', 'customize']
			if (this.chart.hasMapTab) tabs.push('map')
			if (this.chart.type == ChartType.ScatterPlot) tabs.push('scatter')
			return tabs
		}
	}

	@computed get isNewChart() {
		return this.chart.id === undefined
	}

	@computed get features() {
		return new EditorFeatures(this)
	}

	load<T>(promise: Promise<T>) {
		this.currentRequest = promise
		promise.then(() => this.currentRequest = undefined).catch(() => this.currentRequest = undefined)
		return promise
	}

	async fetchData(cacheTag: string) {
		const handleError = (err: string) => {
			var $modal = modal({ title: "Error fetching editor data", content: toString(err) });
			$modal.addClass("error");
		}

		try {
			const response = await this.load(Admin.get("/admin/editorData." + cacheTag + ".json"))
			if (!response.ok) {
				return handleError(await response.text())
			}

			const json = await response.json()
			this.database = new EditorDatabase(json)
		} catch (err) {
			handleError(err)
		}
	}

	async saveChart({ onError }: { onError?: () => void } = {}) {
		const {chart, isNewChart} = this

		const targetUrl = isNewChart ? "/admin/charts" : `/admin/charts/${chart.id}`


		const handleError = (err: string) => {
			var $modal = modal({ title: "Error saving chart", content: toString(err) });
			$modal.addClass("error");
			if (onError) onError()
		}

		try {
			const response = await this.load(Admin.request(targetUrl, chart.json, isNewChart ? 'POST' : 'PUT'))
			if (!response.ok)
				return handleError(await response.text())

			const json = await response.json()

			if (isNewChart) {
				window.location.assign(Admin.url(`/admin/charts/${json.data.id}/edit`))
			} else {
				this.isSaved = true
			}
		} catch (err) {
			handleError(err)
		}
	}

    async saveAsNewChart() {
		const {chart} = this

		const json = chart.json
		delete json.id
		delete json.published

		// Need to open intermediary tab before AJAX to avoid popup blockers
		var w = window.open("/", "_blank");

		const handleError = (err: string) => {
			w.close()
			var $modal = modal({ title: "Error saving chart", content: toString(err) });
			$modal.addClass("error");
		}

		try {
			const response = await this.load(Admin.request("/admin/charts", chart.json, 'POST'))
			if (!response.ok)
				return handleError(await response.text())

			const json = await response.json()

			w.location.assign(Admin.url(`/admin/charts/${json.data.id}/edit`))
		} catch (err) {
			handleError(err)
		}
    }

	publishChart() {
		const url = Global.rootUrl + "/" + this.chart.data.slug

		var $modal = modal();
		$modal.find(".modal-title").html("Publish chart");
		$modal.find(".modal-body").html(
			'<p>This chart will be available at:</p>' +
			'<p><a href="' + url + '" target="_blank">' + url + '</a></p>' +
			'<p>Proceed?</p>'
		);
		$modal.find(".modal-footer").html(
			'<button class="btn btn-danger">Publish chart</button>' +
			'<button class="btn btn-cancel" data-dismiss="modal">Cancel</button>'
		);

		$modal.find(".btn-danger").on("click", () => {
			$modal.modal('hide');

			this.chart.props.isPublished = true
			this.saveChart({ onError: () => this.chart.props.isPublished = undefined })
		})
	}

	unpublishChart() {
		if (window.confirm("Really unpublish chart?")) {
			this.chart.props.isPublished = undefined
			this.saveChart({ onError: () => this.chart.props.isPublished = true })
		}
	}

    constructor(props: ChartEditorProps) {
		const {chart} = props
        this.chart = chart
		this.fetchData(props.cacheTag)
		
		reaction(
			() => chart.json,
			() => this.isSaved = false
		)

		/*reaction(
			() => chart.data.filledDimensions, 
			() => {
				// Be helpful and select some default data
				if (chart.data.isReady && !chart.isScatter && !chart.isSlopeChart && isEmpty(chart.data.selectedKeys)) {
					chart.data.selectedKeys = sampleSize(chart.data.availableKeys, 3)
				}
			}
		)*/
    }
}

// XXX this is old stuff
function modal(options?: any) {
	options = extend({}, options);
	$(".owidModal").remove();

	var html = '<div class="modal owidModal fade" role="dialog">' +
					'<div class="modal-dialog modal-lg">' +
						'<div class="modal-content">' +
							'<div class="modal-header">' +
								'<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
									'<span aria-hidden="true">&times;</span>' +
								'</button>' +
								'<h4 class="modal-title"></h4>' +
							'</div>' +
							'<div class="modal-body">' +
							'</div>' +
							'<div class="modal-footer">' +
							'</div>' +
						'</div>' +
					'</div>' +
				'</div>';

	$("body").prepend(html);
	var $modal = $(".owidModal") as any;
	$modal.find(".modal-title").html(options.title);
	$modal.find(".modal-body").html(options.content);
	$modal.modal("show");
	return $modal;
};