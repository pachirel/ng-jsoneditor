(function() {
  var module = angular.module('ng.jsoneditor', []);

  module.directive('ngJsoneditor', JsonEditorDirective);

  JsonEditorDirective.$inject = [
    '$timeout'
  ];

  function JsonEditorDirective(
    $timeout
  ) {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'options': '=',
        'ngJsoneditor': '=',
        'preferText': '='
      },
      link: link
    };

    function link(scope, element, attrs, ngModel) {
      var internalTrigger = false;
      var editor;
      var debounceTo, debounceFrom;

      if (!angular.isDefined(window.JSONEditor)) {
        throw new Error("Please add the jsoneditor.js script first!");
      }

      scope.$watch('options', onOptionChanged, true);
      scope.$watch('ngModel', updateJsonEditor, true);

      editor = _createEditor();

      ngModel.$render = updateJsonEditor;
      scope.$watch(function() {
        return ngModel.$modelValue;
      }, updateJsonEditor, true);

      return;

      function _createEditor() {
        var defaults = {};
        var settings = angular.extend({}, defaults, scope.options);
        var theOptions = angular.extend({}, settings, {
          change: function() {
            if (typeof debounceTo !== 'undefined') {
              $timeout.cancel(debounceTo);
            }

            debounceTo = $timeout(function() {
              if (editor) {
                internalTrigger = true;
                var error = undefined;
                try {
                  ngModel.$setViewValue(scope.preferText === true ? editor.getText() : editor.get());
                } catch (err) {
                  error = err;
                }

                if (settings && settings.hasOwnProperty('change')) {
                  settings.change(error);
                }
              }
            }, getTimeoutOption());
          }
        });

        element.html('');

        var instance = new JSONEditor(element[0], theOptions);

        if (scope.ngJsoneditor instanceof Function) {
          $timeout(function() {
            scope.ngJsoneditor(instance);
          });
        }

        return instance;
      }

      function getTimeoutOption() {
        var defaultValue = 100;
        if (scope.options === undefined || scope.options === null) {
          return defaultValue;
        }
        return scope.options.timeout;
      }

      function onOptionChanged(newValue, oldValue) {
        if (newValue === undefined || newValue === null) {
          return;
        }

        if (newValue.hasOwnProperty('expanded')) {
          var timeout = getTimeoutOption();
          if (newValue.expanded) {
            $timeout(editor.expandAll, timeout);
          } else {
            $timeout(editor.collapseAll, timeout);
          }
        }

        for (var k in newValue) {
          if (!newValue.hasOwnProperty(k)) {
            continue;
          }

          if (newValue[k] === oldValue[k]) {
            continue;
          }

          var v = newValue[k];

          if (k === 'mode') {
            editor.setMode(v);
          } else if (k === 'name') {
            editor.setName(v);
          } else {
            //other settings cannot be changed without re-creating the JsonEditor
            editor = _createEditor(newValue);
            updateJsonEditor();
            return;
          }
        }
      }

      function updateJsonEditor() {
        console.log('updateJsonEditor(): internalTrigger ==', internalTrigger);
        if (internalTrigger) {
          //ignore if called by $setViewValue (after debounceTo)
          internalTrigger = false;
          return;
        }

        if (typeof debounceFrom !== 'undefined') {
          $timeout.cancel(debounceFrom);
        }

        debounceFrom = $timeout(function() {
          console.log('debounceFrom(): scope.preferText ==', scope.preferText, ', ngModel.$viewValue ==', ngModel.$viewValue);
          if ((scope.preferText === true) && !angular.isObject(ngModel.$viewValue)) {
            editor.setText(ngModel.$viewValue || '{}');
          } else {
            editor.set(ngModel.$viewValue || {});
          }
        }, getTimeoutOption());
      }

    }

  }

})();
