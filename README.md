# Scribble
Scribble is still a work in progress, but it will be a block-based functional
(ML-style) programming language.

# Building
The editor is implemented in vanilla JavaScript. Navigate to `editor.html` in
your browser to test the editor.

The language is implemented in OCaml and requires Oasis to build.

Run `oasis setup` in the `lang` directory to generate a
Makefile. Then, run `make`.