ploverlearn:
	mkdir -p build
	cp resources/* build
	rm build/template.html
	python src/translate-lessons.py
