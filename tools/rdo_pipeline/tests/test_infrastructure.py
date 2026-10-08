from pathlib import Path

from rdo_pipeline.infrastructure import build_valentine_traces


def test_builds_valentine_traces_from_geojson_with_project_crs(tmp_path: Path) -> None:
    roads = tmp_path / 'roads.json'
    rails = tmp_path / 'rails.json'
    roads.write_text('{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.634, -51.96],[106.65, -51.95]]}}]}', encoding='utf-8')
    rails.write_text('{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"type":"railroad"},"geometry":{"type":"LineString","coordinates":[[106.634, -51.96],[106.65, -51.95]]}}]}', encoding='utf-8')

    traces = build_valentine_traces(roads, rails, bounds=(-400, -100, 600, 900))

    assert [trace['kind'] for trace in traces] == ['rail', 'road']
    assert traces[0]['source']['path'] == 'rails.json'
    assert traces[0]['points'][0] == {'x': -300.0, 'z': 750.0}
    assert traces[0]['renderable'] is False
