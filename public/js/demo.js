/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global $ */

'use strict';

$(document).ready(function() {

  // jquery dom variables

  /**
   * Helper functions for displaying autocompletion results
   */
  var getType = function(id) {
    return id.match(/^\/graphs/) ? 'concept' : 'document';
  };
  var trunc = function(s) {
    if (typeof s !== 'string') {
      return '';
    }
    return s.length > 40 ? s.substring(0, 50) + '...' : s;
  };
  var conceptSuggestion = function(d) {
    if (getType(d.id) === 'concept') {
      return '<div><strong>' + d.label + '</strong> <i class=\'pull-right\'>' +
        getType(d.id) + '</i><br><i class="concept-abstract">' + trunc(d.abstract) + '</i></div>';
    } else {
      return '<div><strong>' + d.label + '</strong> <i class=\'pull-right\'>' +
        getType(d.id) + '</i></div>';
    }
  };

  var pendingSuggestion = function(query) {
    return '<div class="tt--search-hint"><i>Searching for ' + query.query + '</i></div>';
  }

  /**
   * Event handler for tab changes
   */
  $('.tab-panels--tab').click(function(e) {
    e.preventDefault();
    var self = $(this);
    var inputGroup = self.closest('.tab-panels');
    var idName = null;

    inputGroup.find('.tab-panels--tab.active').removeClass('active');
    inputGroup.find('.tab-panels--tab-pane.active').removeClass('active');
    self.addClass('active');
    idName = self.attr('href');
    $(idName).addClass('active');
    $('.input--API').removeClass('active');
    $('.input--endpoint').removeClass('active');
    $(idName + '-endpoint').addClass('active');
    $('._demo--output').css('display', 'none');
  });

  /**
   * Event handler for concept tabs
   */
  $('.concept--new-concept-container').click(function(e) {
    e.preventDefault();
    var self = $(this);
    var concept = self.closest('.concept');

    concept.find('.active').removeClass('active');
    concept.find('.concept--input-container').addClass('active');
    concept.find('.concept--input').focus();
  });

  /**
   * Event handler for auto complete
   */
  $('.concept--input').citypeahead({
    selectionCb: selectionCallback,
    hint: false
  }, {
    templates: {
      suggestion: conceptSuggestion,
      pending: pendingSuggestion
    },
    source: sourceLabelSearch
  });

  $('.concept--input').keyup(function (e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if (code == 13){
      console.log($('.tt-suggestion').first().attr('class'));
      $('.tt-suggestion').first().addClass('tt-cursor');

    }
  });

  var query_data = '';

  function sourceLabelSearch(query, callback) {
    query_data = query;
    return $.get('/api/labelSearch', {
      query: query,
      limit: 7,
      concept_fields: JSON.stringify({
        abstract: 1
      })
    }).done(function(results) {
      $('#concepts-panel-API-data').empty();
      $('#concepts-panel-API-data').html(JSON.stringify(results, null, 2));
      $('#label-search-view-code-btn').removeAttr('disabled');
      $('#label-search-view-code-btn').prev().removeClass('icon-code-disabled');

      if(results.matches.length == 0){
        $('.tt-dataset').html('<div class="tt--search-hint"><i>no concepts found</i></div>');
      }

      var filtered = {};
      filtered['matches'] = results.matches.filter(function(elem) {
        return elem.id.match(/^\/graphs/);
      });
      callback(filtered);
    }).fail(function(error) {
      // console.log('sourceLabelSearch.error:',error)
    });
  }

  function selectionCallback(concept) {
    var label = concept.label;
    var $template = $('.concept').last().clone();

    $template.find('.label').text(label);
    $template.find('.label').attr('concept_id', concept.id);
    $template.find('.concept--close-icon').click(function() {
      $(this).closest('.concept').remove();
      fetch_ted_based_on_concepts();
    });
    $template.insertBefore('.concept:nth-last-child(1)');

    $('.concept:nth-last-child(1) > .concept--input-container').empty();
    $('.concept:nth-last-child(1) > .concept--input-container')
      .html('<input class="concept--input" type="text">');

    $('.concept--input').citypeahead({
      selectionCb: selectionCallback,
      hint: false
    }, {
      templates: {
        suggestion: conceptSuggestion,
        pending: pendingSuggestion
      },
      source: sourceLabelSearch
    });

    $('.concept--input').keyup(function (e) {
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 13){
        console.log($('.tt-suggestion').first().attr('class'));
        $('.tt-suggestion').first().addClass('tt-cursor');

      }
    });

    $('.concept:nth-last-child(1) > .concept--input-container').removeClass('active');
    $('.concept:nth-last-child(1) > .concept--new-concept-container').addClass('active');

    fetch_ted_based_on_concepts();
  }

  /**
   * Event handler for reset button
   */
  $('.reset-button').click(function(){
    location.reload();
  });

  /**
   * Event handler for using sample text
   */
  $('#sample-1').click(function(){
    $.ajax({
        url : '../data/declaration.txt',
        dataType: "text",
        success : function (data) {
            $("#body-of-text").text(data);
            getAbstractConcepts();
        }
    });
  });

  $('#sample-2').click(function(){
    $.ajax({
        url : '../data/emmewatson.txt',
        dataType: "text",
        success : function (data) {
            $("#body-of-text").text(data);
            getAbstractConcepts();
        }
    });
  });



});

function show_label_search_response() {
  $('#concepts-panel-API').toggleClass('active');
}

function show_text_annotator_response() {
  $('#text-panel-API').toggleClass('active');
}

function show_conceptual_search_response() {
  $('#TED-code-container').toggleClass('active');
}

function fetch_ted_based_on_concepts() {
  var concept_array = [];
  var input_concept_labels = [];
  var $user_input_concepts = $('.concept--input-concept-list > .concept > .concept--typed-concept-container > .concept--typed-concept');
  for (var i = 0; i < ($user_input_concepts.length < 3 ? $user_input_concepts.length : 3); i++) {
    concept_array.push($('.concept--input-concept-list > .concept > .concept--typed-concept-container > .concept--typed-concept:eq(' + i + ')').attr('concept_id'));
    input_concept_labels.push($('.concept--input-concept-list > .concept > .concept--typed-concept-container > .concept--typed-concept:eq(' + i + ')').text());
  }

  $('._demo--output').css('display', 'none');
  $('._content--loading').show();

  $.get('/api/conceptualSearch', {
      ids: concept_array,
      limit: 3,
      document_fields: JSON.stringify({
        user_fields: 1
      })
    })
    .done(function(results) {

      $('#TED-panel-API-data').empty();
      $('#TED-panel-API-data').html(JSON.stringify(results, null, 2));

      $('#TED-panel-list').empty();
      for (var i = 0; i < results.results.length; i++)
          generate_TED_panel(results.results[i], input_concept_labels);
    }).fail(function(error) {
      error = error.responseJSON ? error.responseJSON.error : error.statusText;
      console.log('error:', error);
    }).always(function() {

      $('._content--loading').css('display', 'none');
      $('._demo--output').show();

      var top = document.getElementById('try-this-service').offsetTop;
      window.scrollTo(0, top);

    });

}

var typingTimer;
var doneTypingInterval = 500;  // 0.5 seconds
var $input = $('#body-of-text');

//on keyup, start the countdown
$input.on('keyup', function () {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(getAbstractConcepts, doneTypingInterval);
});

//on keydown, clear the countdown
$input.on('keydown', function () {
  clearTimeout(typingTimer);
});

var previousText = '';
function getAbstractConcepts() {
  var text = $('#body-of-text').text();
  text = text.length > 0 ? text : ' ';
  if(text != previousText){
    $.post('/api/extractConceptMentions', {
        text: text
      })
      .done(function(results) {

        $('.concept--abstract-concept-list').empty();

        var unique_concept_array = [];

        if (results.annotations.length)
          $('.concept--abstract-concept-title').addClass('active');

        for (var i = 0; i < results.annotations.length; i++) {
          if (check_duplicate_concept(unique_concept_array, results.annotations[i].concept.id) || unique_concept_array.length == 3)
            continue;
          else
            unique_concept_array.push(results.annotations[i].concept.id);

          var abstract_concept_div = '<div class="concept--abstract-concept-list-container"><span class="concept--abstract-concept-list-item" concept_id="' + results.annotations[i].concept.id + '">' + results.annotations[i].concept.label + '</span></div>';
          $('.concept--abstract-concept-list').append(abstract_concept_div);
        }

        $('#text-panel-API-data').empty();
        $('#text-panel-API-data').html(JSON.stringify(results, null, 2));
        $('#text-annotator-view-code-btn').removeAttr('disabled');
        $('#text-annotator-view-code-btn').prev().removeClass('icon-code-disabled');

        var concept_array = [];
        var input_concept_labels = [];
        for (var i = 0; i < ($('.concept--abstract-concept-list-item').length < 3 ? $('.concept--abstract-concept-list-item').length : 3); i++) {
          concept_array.push($('.concept--abstract-concept-list-item:eq(' + i + ')').attr('concept_id'));
          input_concept_labels.push($('.concept--abstract-concept-list-item:eq(' + i + ')').text());
        }

        $('#TED-panel-API-data').empty();
        $('#TED-panel-list').empty();
        if (concept_array.length > 0) {
          $('._demo--output').css('display', 'none');
          $('._content--loading').show();

          $.get('/api/conceptualSearch', {
              ids: concept_array,
              limit: 3,
              document_fields: JSON.stringify({
                user_fields: 1
              })
            })
            .done(function(results) {

              $('#TED-panel-API-data').empty();
              $('#TED-panel-API-data').html(JSON.stringify(results, null, 2));

              $('#TED-panel-list').empty();
              for (var i = 0; i < results.results.length; i++)
                generate_TED_panel(results.results[i], input_concept_labels);
            }).fail(function(error) {
              error = error.responseJSON ? error.responseJSON.error : error.statusText;
              console.log('error:', error);
            }).always(function() {
              $('._content--loading').css('display', 'none');
              $('._demo--output').show();

              var top = document.getElementById('try-this-service').offsetTop;
              window.scrollTo(0, top);
            });
        }

      }).fail(function(error) {
        error = error.responseJSON ? error.responseJSON.error : error.statusText;
        console.log('extractConceptMentions error:', error);
      }).always(function() {

      });
      previousText = text;
    }
}

function check_duplicate_concept(unique_concept_array, concept) {
  for (var i = 0; i < unique_concept_array.length; i++) {
    if (unique_concept_array[i] == concept)
      return true;
  }

  return false;
}

function generate_TED_panel(TED_data, your_input_concepts) {
  var TED_panel = '<div class="_TED-panel">' + '<div class="_TED-panel--TED">';

  var TED_info_above = '<div class="TED--info-above">' + '<a class="TED--title" href="' + TED_data.user_fields.link + '" target="_blank">' + TED_data.label + '</a>' + '<div class="TED--author">' + TED_data.user_fields.author + '</div> <div class="TED--date">' + TED_data.user_fields.publicationDate + '</div><div class="TED--score">' + '<span class="TED--score-title">' + 'Confidence Score:' + '</span>' + '<span class="TED--score-value">' + Math.floor(TED_data.score * 100) + '</span>' + '</div>' + '</div>';

  TED_panel += TED_info_above;

  var TED_thumbnail = '<div class="TED--img">' + '<a class="TED--title" href="' + TED_data.user_fields.link + '" target="_blank"><img src="' + TED_data.user_fields.thumbnail + '" alt=""></a>' + '</div>';

  TED_panel += TED_thumbnail;

  var TED_info_below = '<div class="TED--info-below">' + 
  					   		'<a class="TED--title" href="' + TED_data.user_fields.link + '" target="_blank">' + TED_data.label + '</a>' + 
  					   		'<div class="TED--author">by ' + TED_data.user_fields.author + ', published on ' + TED_data.user_fields.publicationDate + '</div>' + 
  					   		'<div class="TED--author">Document sentiment is ' + TED_data.user_fields.sentiment + ' with ' + TED_data.user_fields.emotions + ' emotions</div>' + 
  					   		'<div class="TED--score">' + '<span class="TED--score-title">' + 'Confidence Score : ' + '</span>' + '<span class="TED--score-value">' + Math.floor(TED_data.score * 100) + '%' + '</span>' + '</div>' + 
  					   	'</div>';

  TED_panel += TED_info_below;

  TED_panel += '</div>';

  TED_panel += '<div class="_TED-panel--how-it-works">' + '<div class="how-it-works--graph">' + '<div class="concept--your-input-list">';

  var your_input_list = '';
  var $TED_input_list = $('#TED1-panel > .base--textarea > ._TED-panel > ._TED-panel--how-it-works > .how-it-works--graph > .concept--your-input-list');
  for (var i = 0; i < your_input_concepts.length; i++) {
    var your_input_list_item = '<div class="concept--your-input-list-item">' + '<div class="concept--your-input">' + '<span class="concept--typed-concept">' + your_input_concepts[i] + '</span>' + '</div>' + '</div>';

    your_input_list += your_input_list_item;
  }
  TED_panel += your_input_list;

  TED_panel += '</div>' + '<div class="concept--derived-concept-list">';

  var derived_concept_list = '';
  var $TED_derived_concept_list = $('#TED1-panel > .base--textarea > ._TED-panel > ._TED-panel--how-it-works > .how-it-works--graph > .concept--derived-concept-list');
  for (var i = 0; i < 3; i++) {
    if (i == 0) {
      var derived_concept_list_item = '<div class="concept--derived-concept-list-item">' + '<div class="concept--derived-concept active" data-index="' + i + '">' + '<span class="concept--typed-concept">' + TED_data.explanation_tags[i].concept.label + '</span>' + '</div>' + '</div>';

    } else {
      var derived_concept_list_item = '<div class="concept--derived-concept-list-item">' + '<div class="concept--derived-concept" data-index="' + i + '">' + '<span class="concept--typed-concept">' + TED_data.explanation_tags[i].concept.label + '</span>' + '</div>' + '</div>';

    }

    derived_concept_list += derived_concept_list_item;
  }
  TED_panel += derived_concept_list;

  TED_panel += '</div>' + '</div>';

  TED_panel += '<div class="how-it-works--passage-list">';

  for (var i = 0; i < 3; i++) {
    if (i == 0) {
      TED_panel += '<blockquote class="base--blockquote how-it-works--passage active">' + '"' + TED_data.explanation_tags[i].passage + '"' + '</blockquote>';
    } else {
      TED_panel += '<blockquote class="base--blockquote how-it-works--passage">' + '"' + TED_data.explanation_tags[i].passage + '"' + '</blockquote>';
    }
  }

  TED_panel += '</div>';

  TED_panel += '</div>' + '</div>';

  $('#TED-panel-list').append(TED_panel);


  $('.concept--derived-concept').click(function(e) {
    e.preventDefault();
    var self = $(this);
    var how_it_works = self.closest('._TED-panel--how-it-works');
    var index = self.attr('data-index');

    how_it_works.find('.concept--derived-concept.active').removeClass('active');
    self.addClass('active');
    how_it_works.find('.how-it-works--passage.active').removeClass('active');
    how_it_works.find('.how-it-works--passage-list').children().eq(index).addClass('active');
  });

  $('.concept--derived-concept').hover(function(e) {
    e.preventDefault();
    var self = $(this);
    var how_it_works = self.closest('._TED-panel--how-it-works');
    var index = self.attr('data-index');

    how_it_works.find('.concept--derived-concept.active').removeClass('active');
    self.addClass('active');
    how_it_works.find('.how-it-works--passage.active').removeClass('active');
    how_it_works.find('.how-it-works--passage-list').children().eq(index).addClass('active');
  });

}
