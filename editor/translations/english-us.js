;'use strict';

(function() {
var grammar = new Bexp.Grammar.Grammar();

grammar.addNonterminal('expr', 'Expression')
    .addProduction('apply').dsl
        .nt('expr', 'function').nt('expr', 'argument')

    .end().addProduction('if').dsl
        .tok('if').nt('expr', 'pred').tok('then')
        .indent().nt('expr', 'cons').outdent()
        .tok('else')
        .indent().nt('expr', 'alt')

    .end().addProduction('let').dsl
        .tok('let').nt('bindingList', 'bindings').tok('in').endl()
        .nt('expr', 'body')

    .end().addProduction('letRec').dsl
        .tok('let rec').nt('bindingList', 'bindings').tok('in').endl()
        .nt('expr', 'body')

    .end().addProduction('match').dsl
        .tok('switch').nt('expr', 'test').tok('with').endl()
        .nt('case', 'case')

    .end().addProduction('seq').dsl
        .nt('expr', 'first').tok(';').endl()
        .nt('expr', 'second')
    ;

grammar.addNonterminal('bindingList', 'Binding List')
    .addProduction('cons').dsl
        .nt('pattern', 'pat').tok('=').nt('expr', 'def').endl()
        .nt('bindingList', 'cdr')

    .end().addProduction('nil').dsl
        .tok('end defs')

grammar.addNonterminal('case', 'Case')
    .addProduction('case').dsl
        .tok('case').nt('pattern', 'pat').tok(':')
        .indent().nt('expr', 'expr')

    .end().addProduction('caseIf').dsl
        .tok('case').nt('pattern', 'pat').tok('if').nt('expr', 'pred').tok(':')
        .indent().nt('expr', 'expr')
    ;

grammar.addNonterminal('caseList', 'Case List')
    .addProduction('cons').dsl
        .tok('|').nt('case', 'car').endl().nt('caseList', 'cdr')

    .end().addProduction('nil').dsl
        .tok('end switch')
    ;

Bexp.Translations['eng-us'] = grammar;
})();
