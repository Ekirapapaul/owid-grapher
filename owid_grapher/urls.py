"""owid_grapher URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls import url, include
from grapher_admin import views as admin_views
from owid_grapher import views as owid_views
from country_name_tool import views as countrytool_views
from importer import views as importer_views
from django.contrib.auth.views import logout

urlpatterns = [
    url(r'^grapher/?$', owid_views.index, name="index"),
    url(r'^grapher/login$', owid_views.index, name="index"), # Backwards compatibility
    url(r'^grapher/admin/charts$', admin_views.storechart, name="storechart"),  # post request for storing
    url(r'^grapher/admin/import/?$', admin_views.importdata, name="importdata"),
    url(r'^grapher/admin/import/variables$', admin_views.store_import_data, name="storeimportdata"),  # data import post requests
    url(r'^grapher/admin/datasets/?$', admin_views.listdatasets, name="listdatasets"),
    url(r'^grapher/admin/datasets_treeview/?$', admin_views.treeview_datasets, name="treeviewdatasets"),
    url(r'^grapher/admin/datasets/(?P<datasetid>[\w]+)/$', admin_views.showdataset, name="showdataset"),
    url(r'^grapher/admin/datasets/(?P<datasetid>[\w]+)$', admin_views.managedataset, name="managedataset"),
    url(r'^grapher/admin/datasets/(?P<datasetid>[\w]+)/edit/$', admin_views.editdataset, name="editdataset"),
    url(r'^grapher/admin/datasets/(?P<datasetid>[\w]+)\.csv$', admin_views.dataset_csv, name="datasetcsv"),
    url(r'^grapher/admin/datasets/(?P<datasetid>[\w]+)\.json$', admin_views.dataset_json, name="datasetjson"),
    url(r'^grapher/admin/datasets/history/all$', admin_views.all_dataset_history, name="alldatasethistory"),
    url(r'^grapher/admin/datasets/history/(?P<datasetid>[\w]+)$', admin_views.show_dataset_history, name="datasethistory"),
    url(r'^grapher/admin/datasets/history/(?P<namespace>[\w]+)/(?P<commit_hash>[\w]+)$', admin_views.serve_diff_html, name="datasetdiff"),
    url(r'^grapher/admin/datasets/history/(?P<namespace>[\w]+)/(?P<commit_hash>[\w]+)/(?P<filetype>[\w]+)$', admin_views.serve_commit_file, name="datasetcommitfile"),
    url(r'^grapher/admin/categories/$', admin_views.listcategories, name="listcategories"),
    url(r'^grapher/admin/categories/(?P<catid>[\w]+)/$', admin_views.showcategory, name="showcategory"),
    url(r'^grapher/admin/categories/(?P<catid>[\w]+)$', admin_views.managecategory, name="managecategory"),
    url(r'^grapher/admin/categories/(?P<catid>[\w]+)/edit/$', admin_views.editcategory, name="editcategory"),
    url(r'^grapher/admin/variables/$', admin_views.listvariables, name="listvariables"),
    url(r'^grapher/admin/variables/[\w]+/?$', admin_views.single_page_app, name="showvariable"),
    url(r'^grapher/admin/variables/(?P<variableid>[\w]+)$', admin_views.managevariable, name="managevariable"),
    url(r'^grapher/admin/variables/(?P<variableid>[\w]+)/edit/$', admin_views.editvariable, name="editvariable"),
    url(r'^grapher/admin/sources/(?P<sourceid>[\w]+)/$', admin_views.showsource, name="showsource"),
    url(r'^grapher/admin/sources/(?P<sourceid>[\w]+)/edit/$', admin_views.editsource, name="editsource"),
    url(r'^grapher/admin/sources/(?P<sourceid>[\w]+)$', admin_views.managesource, name="managesource"),
    url(r'^grapher/admin/subcategories/(?P<subcatid>[\w]+)/edit/$', admin_views.editsubcategory, name="editsubcategory"),
    url(r'^grapher/admin/subcategories/(?P<subcatid>[\w]+)$', admin_views.managesubcategory, name="managesubcategory"),
    url(r'^grapher/admin/subcategories/create/$', admin_views.createsubcategory, name="createsubcategory"),
    url(r'^grapher/admin/subcategories$', admin_views.storesubcategory, name="storesubcategory"),
    url(r'^grapher/admin/users/$', admin_views.listusers, name="listusers"),
    url(r'^grapher/admin/users/(?P<userid>[\w]+)/edit/$', admin_views.edituser, name="edituser"),
    url(r'^grapher/admin/users/(?P<userid>[\w]+)$', admin_views.manageuser, name="manageuser"),
    url(r'^grapher/admin/standardize/$', countrytool_views.country_tool_page, name="countrytoolpage"),
    url(r'^grapher/admin/standardize/countrytooldata/$', countrytool_views.serve_country_tool_data, name="servecountrytooldata"),
    url(r'^grapher/admin/standardize/update/$', countrytool_views.country_tool_update, name="countrytoolupdate"),
    url(r'^grapher/admin/standardize/csv/(?P<filename>[^/]+)$', countrytool_views.servecsv, name="servecsv"),
    url(r'^grapher/admin/standardize/instructions/', countrytool_views.serve_instructions, name="countrytoolinstructions"),
    url(r'^grapher/admin/invite/?$', admin_views.invite_user, name="inviteuser"),
    url(r'^grapher/admin/unwppdatasets/?$', importer_views.listunwppdatasets, name="listunwppdatasets"),
    url(r'^grapher/admin/qogdatasets/?$', importer_views.listqogdatasets, name="listqogdatasets"),
    url(r'^grapher/admin/faodatasets/?$', importer_views.listfaodatasets, name="listfaodatasets"),
    url(r'^grapher/admin/clioinfradatasets/$', importer_views.listclioinfradatasets, name="listclioinfradatasets"),
    url(r'^grapher/admin/wb/(?P<dataset>[\w]+)/?$', importer_views.listwbdatasets, name="listwbdatasets"),
    url(r'^grapher/admin/gbdcausedatasets/?$', importer_views.listgbdcausedatasets, name="listgbdcausedatasets"),
    url(r'^grapher/admin/gbdriskdatasets/?$', importer_views.listgbdriskdatasets, name="listgbdriskdatasets"),
    url(r'^grapher/admin/ilostatdatasets/?$', importer_views.listilostatdatasets, name="listilostatdatasets"),
    # for future use on the frontend
    url(r'^grapher/admin/import.json$', admin_views.importdata, name="importdatajson"),
    url(r'^grapher/admin/users\.json$', admin_views.listusers, name="listusersjson"),

    # Admin API
    url(r'^grapher/admin/api/charts\.json$',  admin_views.chartsjson, name="chartsjson"),
    url(r'^grapher/admin/api/charts/(?P<chartid>[\d]+).config.json$', admin_views.config_json_by_id, name="configjsonbyid"),
    url(r'^grapher/admin/api/charts/(?P<chartid>[\d]+)/star$', admin_views.starchart, name="starchart"),
    url(r'^grapher/admin/api/charts/(?P<chartid>[\d]+)/unstar$', admin_views.unstarchart, name="unstarchart"),
    url(r'^grapher/admin/api/charts/(?P<chartid>[\d]+)$', admin_views.managechart, name="managechart"),  # update, destroy requests
    url(r'^grapher/admin/api/editorData/namespaces\.(?P<cachetag>[^.]*?)\.?json', admin_views.editordata, name="editordata"),
    url(r'^grapher/admin/api/editorData/(?P<namespace>[^.]*?)\.(?P<cachetag>[^.]*?)\.?json', admin_views.namespacedata, name="namespacedata"),
    url(r'^grapher/admin/api/variables/(?P<variableid>[\d]+).json$', admin_views.variablejson, name="variablejson"),

    # Catchall-- single page app
    url(r'^grapher/admin.*$', admin_views.single_page_app, name="adminspa"),

    ### Public
    url(r'^grapher/admin/login$', admin_views.custom_login, name='login'),
    url(r'^grapher/admin/logout/?$', logout, {'next_page': settings.BASE_URL}, name="logout"),
    url(r'^grapher/embedCharts.js$', owid_views.embed_snippet, name="embedsnippet"),
    url(r'^grapher/data/variables/(?P<ids>[\d+]+)$', owid_views.variables, name="servevariables"),
    url(r'^grapher/latest/?$', owid_views.latest, name="latestchart"),
    url(r'^grapher/testall', owid_views.test_all, name="testall"),
    url(r'^grapher/testsome', owid_views.testsome, name="testsome"),
    url(r'^grapher/invitation/(?P<code>[\w]+)$', admin_views.register_by_invite, name="registerbyinvite"),
    url(r'^grapher/(?P<slug>[^/]+)\.config\.json', owid_views.config_json_by_slug, name="configjsonbyslug"),
    url(r'^grapher/(?P<slug>[^/]+)\.export', owid_views.show, name="exportchart"),
    url(r'^grapher/(?P<slug>[^/]+)\.(?P<fileformat>.+)', owid_views.exportfile, name="exportfile"),
    url(r'^grapher/(?P<slug>[^/]+)/?$', owid_views.show, name="showchart"),
    url(r'^grapher/wdi/WDI_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servewdicountryinfo'),
    url(r'^grapher/edstats/EDSTATS_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='serveedstatscountryinfo'),
    url(r'^grapher/genderstats/GENDERSTATS_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servegenderstatscountryinfo'),
    url(r'^grapher/hnpstats/HNPSTATS_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servehnpstatscountryinfo'),
    url(r'^grapher/findex/FINDEX_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servefindexcountryinfo'),
    url(r'^grapher/bbsc/BBSC_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servebbsccountryinfo'),
    url(r'^grapher/povstats/POVSTATS_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servepovstatscountryinfo'),
    url(r'^grapher/hnpqstats/HNPQSTATS_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='servehnpqstatscountryinfo'),
    url(r'^grapher/aspire/ASPIRE_Country_info.xls$', importer_views.serve_wb_country_info_xls, name='serveaspirecountryinfo'),
]
