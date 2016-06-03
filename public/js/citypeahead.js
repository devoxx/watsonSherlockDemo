/*
 * Concept Insights Typeahead extension
 * Requires jQuery and https://github.com/twitter/typeahead.js
 * Copyright 2015 IBM; Licensed Apache v2.0
 */
'use strict';

(function($) {
  var ciTypeaheadKey = 'ttCiTypeahead';
  var makeTemplates = function(ciopts, templates) {
    if (!templates.hasOwnProperty('suggestion')) {
      templates['suggestion'] = defaultSuggestionTemplate;
    }
    return templates;
  };
  var getType = function(id) {
    return id.match(/^\/graphs/) ? 'concept' : 'document';
  };
  var defaultSuggestionTemplate = function(d) {
    return '<div><strong>' + d.label + '</strong> <i class=\'pull-right\'>' +
      getType(d.id) + '</i></div>';
  };
  var doSelection = function(cb) {
    return function(ev, datum, name) {
      cb(datum);
    };
  };
  var cikeys = ['buttons', 'selectionCb'];
  var initialize = function(options, args) {
    args = $.isArray(args) ? args : [].slice.call(arguments, 1);
    options = options || {};
    var cioptions = {};
    cikeys.forEach(function(key) {
      if (options.hasOwnProperty(key)) {
        cioptions[key] = options[key];
        delete options[key];
      }
    });

    var datasets = [];
    var citypeahead = {
      'opts': cioptions,
      'pending': null
    };
    args.forEach(function(a) {
      var d = {};
      d.display = 'label';
      if (a['name']) {
        d.name = a.name;
      }
      d.source = function(q, sync, async) {
        if (citypeahead.pending != null) {
          citypeahead.pending.abort();
          citypeahead.pending = null;
        }
        citypeahead.pending = a.source(q, function(r) {
          async(r.matches);
        });
        return citypeahead.pending;
      };
      d.templates = makeTemplates(cioptions, a['templates'] || {});
      datasets.push(d);
    });
    $(this).typeahead(options, datasets);
    $(this).data(ciTypeaheadKey, citypeahead);
    if (citypeahead.opts['selectionCb']) {
      $(this).on('typeahead:selected', doSelection(citypeahead.opts.selectionCb));
    }
  };
  (function() {
    $.fn.citypeahead = function() {
      initialize.apply(this, arguments);
      return this;
    };
  })();
})(window.jQuery);