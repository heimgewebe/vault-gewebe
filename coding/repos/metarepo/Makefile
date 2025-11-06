UV ?= uv
REPOS_YML := repos.yml
ORG_GENERATOR := $(UV) run scripts/generate_org_assets.py --repos-file $(REPOS_YML)

.PHONY: all deps index graph linkcheck

all: index graph

deps:
	$(UV) sync --frozen

index: deps
	$(ORG_GENERATOR) --index docs/org-index.md

graph: deps
	$(ORG_GENERATOR) --graph docs/org-graph.mmd

linkcheck:
	docker run --rm -v $$(pwd):/work ghcr.io/lycheeverse/lychee:v0.14.3 --config /work/.lychee.toml
