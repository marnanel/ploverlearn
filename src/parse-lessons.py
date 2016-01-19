import json
import os
import os.path
import glob

def parse_lesson_file(filename):
	lines = [x.replace('\n','') for x in file(filename)]

	fields = {
		'ignore_characters': '',
		'case_sensitive': '',
		'require_spaces': '',
		'title': lines[0],
		'subtitle': lines[1],
	}

	questions = []
	for line in lines[2:]:
		if line.startswith("'"):
			(word, hint) = line.split(':')
			word = word.replace("'",'').strip()
			hint = hint.strip()
			questions.append([word,hint])
		else:
			(name, value) = line.split('=')
			fields[name] = value

	fields['questions'] = questions

	return fields

def filename_to_target_filename(source):
	source = os.path.abspath(source)
	lesson_name = source.split(os.sep)[-2]

	return os.path.join('build',
		lesson_name+'.html')

def handle_lesson_file(filename,
		template):

	lesson = parse_lesson_file(filename)

	js_literal = 'playQuiz(%s);\n' % (
			json.dumps(lesson,
				sort_keys=True,
				indent=4),
			)

	target = file(filename_to_target_filename(filename),
			'w')

	for line in template:
		if 'invocation here' in line:
			target.write(js_literal)
		elif 'title here' in line:
			target.write('%(subtitle)s - Plover Learn\n' % lesson)
		else:
			target.write(line)

	target.close()

def main():
	template = file('resources/template.html', 'r').readlines()

	os.path.walk('.',
		lambda arg, dirname, filenames: [
			handle_lesson_file(
				os.path.join(dirname,x),
				template)
			for x in filenames
			if x=='lesson.txt'],
			None)

	handle_lesson_file('lessons/Lesson10/lesson.txt',
		template=template)

if __name__=='__main__':
	main()

