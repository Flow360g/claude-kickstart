"""Writes a copy of index.html shaped for a claude.ai Artifact (no doctype/html/head/body wrapper).
Usage: python3 tools/artifact.py <out.html>"""
import re, sys
s = open('index.html').read()
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s, flags=re.I)
s = re.sub(r'<meta charset[^>]*>\s*<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('</head>\n<body>\n', '\n').replace('</body>\n</html>\n', '')
open(sys.argv[1], 'w').write(s)
