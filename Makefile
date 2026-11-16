.PHONY: update
update:
	@set -- *.xlsx; \
	if [ ! -e "$$1" ]; then echo "No .xlsx file found"; exit 1; fi; \
	if [ $$# -gt 1 ]; then echo "More than one .xlsx file: $$*"; exit 1; fi; \
	echo "Replacing source/menu.xlsx with $$1"; \
	mv "$$1" source/menu.xlsx
	python3 scripts/convert_menu.py source/menu.xlsx data/menu.json
	git add source/menu.xlsx data/menu.json
	git commit -m "Update menu"
	git push
	@echo "Pushed the changes"
