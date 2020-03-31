var keys = {};     //liest die gedrückten Tasten ein, wird genutzt für Mac/Safari "Smart" Reload
    var setval = "";    //die Variable fÃ¼r den Timer/setInterval
    var input_key_value = 32;
    var $inputfield = $("input#inputfield");
    var $row1 = $("#row1");
    var $reloadBtn = $("#reload-btn");
    var $row1_span_wordnr;

    var param_duration = 30; //default 1 minute/ 60 seconds
    var param_rand = 1; //randomization active
    var param_words = ''; //words picked by the user

    $(document).ready(function()
    {
        //only add google analytics if iframed page (not on 10fastfingers directly, as we have are already included google analytics)
        if(self != top)
        {
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

            ga('create', 'UA-179742-52', 'auto');
            ga('set', 'anonymizeIp', true);

            ga('send', 'event', {
                eventCategory: 'Custom TT',
                eventAction: 'loaded',
                eventLabel: document.referrer
            });
        }

        read_url_data();
        update_embed_input_content();
        restart();
        activate_keylistener();

        $("button#apply-settings").on('click', function(){
            apply_settings();
        });

        $("#settings-link").on('click', function(){
            $("#settings").slideToggle();
        });

        $("#embed-link").on('click', function(){
            $("#embed").slideToggle();
        });

        //reload-button
        //oder "F5"-Taste abfangen
        $(document).keydown(function(event) {
            if ( event.which == 116 ) {
                loading = 1;
                restart();
                return false;
            }

            keys[event.which] = true;
        });

        $(document).keyup(function (event) {
            delete keys[event.which];
        });

        $("#reload-btn").on('click', function(){
            restart();
            return false;
        });
    });

    function read_url_data() {
        param_duration = GetURLParameter('dur');
        param_rand = GetURLParameter('rand');
        param_words = GetURLParameter('words');

        //recover apostrophe from %27 => '
        if(typeof param_words !== 'undefined') {
            param_words = param_words.split("%27").join("'");
            param_words = param_words.split("%20").join(" ");
            param_words = decodeURIComponent(param_words);
            $("#settings textarea").text(param_words)
            $('#wordlist').text(param_words);
        } else
            param_words = '';

        //check if duration exists and is integer value
        if (typeof param_duration === 'undefined')
            param_duration = 30;

        if (typeof param_rand === 'undefined')
            param_rand = 1;

        $("select#settings-duration option").each(function(){
            if($(this).val() == param_duration){ // EDITED THIS LINE
                $(this).attr("selected","selected");
            }
        });

        if(param_rand == 0)
            $("input[name='randomize']").prop('checked', false);
    }

    function apply_settings() {
        $('#wordlist').html($("#settings textarea").val());

        //adjust URL parameters
        history.replaceState(null, null, 'https://10fastfingers.com/widget/typingtest?dur=' + $("select#settings-duration option:selected").val() + '&rand=' + $("input[type='checkbox']:checked").length + '&words='+$("#settings textarea").val());

        read_url_data();

        update_embed_input_content();

        restart();
    }

    function update_embed_input_content()
    {
        var tmp_param_words = param_words.replace(/ /g, "%20");
        var tmp_param_words = tmp_param_words.replace(/'/g, "%27");

        var embed_settings = '?dur=' + param_duration + '&rand=' + param_rand + '&words=' + tmp_param_words;
        var embed_code = '<iframe width="640" height="600" src="https://10fastfingers.com/widgets/ttembeddable/'+ embed_settings +'" frameborder="0"></iframe>';
        $("#embed input").val(embed_code);
    }

    function restart()
    {
        //wird beim start und beim klick auf "restart" aufgerufen
        //ruft initialisierungsfunktionen auf und setzt werte zurÃ¼ck auf den startwert
        word_string = '';
        words = '';
        row1_string = '';
        word_pointer = 0;
        user_input_stream = '';
        countdown = param_duration;
        cd_started = 0;
        previous_position_top = 0;
        row_counter = 0;
        eingabe = '';
        min_words = 0;
        //start_time_set = 0;

        result_wpm  = 0;
        result_correct = 0;
        result_wrong = 0;
        result_keystrokes_correct = 0;
        result_keystrokes_wrong = 0;
        backspace_counter = 0;

        var timer_string = "0:00";

        if(countdown == 30) {
            var timer_string = "0:30";
            min_words = 100;
        } else if(countdown == 60) {
            var timer_string = "1:00";
            min_words = 200;
        } else if(countdown == 120) {
            var timer_string = "2:00";
            min_words = 400;
        } else if(countdown == 300) {
            var timer_string = "5:00";
            min_words = 1000;
        } else if(countdown == 600) {
            var timer_string = "10:00";
            min_words = 2000;
        }

        $("#timer").text(timer_string);

        $("#ajax-load").css('display', 'block');
        $("#reload-box").css('display', 'none');
        $("#row1").css('top', "1px");
        $("#timer").removeClass("off");

        window.clearInterval(setval);
        setval = "";

        $("#ajax-load").css('display', 'none');
        $("#reload-box").css('display', 'block');

        word_string = $('#wordlist').text();
        words = word_string.split("|");

        //auto-detect input method, use ENTER for chinese & japanese
        if($('#wordlist').text().match(/[\u3400-\u9FBF]/))
            input_key_value = 13;

        if ( $('input[name="randomize"]').is(':checked') || param_rand == 1)
            words = shuffleArray(words);

        //repeat wordlist till at least 50 words
        repeat_increase_wordlist();

        word_string = words.join(" ");
        words = word_string.split(" ");
        console.log(words);

        fill_line_switcher();

        //initialisiere wichtige Startwerte die abhÃ¤ngig von der TextgrÃ¶ÃŸe ist
        p = $('#row1 span[wordnr="'+word_pointer+'"]').position();

        previous_position_top = 0;

        line_height = parseInt($('#row1 span[wordnr="'+word_pointer+'"]').css('line-height'));

        // line_height = parseInt($('#row5 span[wordnr=""]').css('line-height') );

        $inputfield.val('');
        //$inputfield.focus();

        $("#row1").show();
        $("#words").fadeTo('fast', 1.0);
 $("#inputfield").show();


 loading = 0;
    }

    function repeat_increase_wordlist() {
        while(words.length < min_words) {
            words = words.concat(words);
        }
    }

    //wartet auf Eingaben die im #inputfield erfolgen
    function activate_keylistener() {
        var android_spacebar = 0;

        // Android/mobile specific function to check if inputfield contains a space-char, as the keyup function doesn't work on Android+Chrome
        $(window).on("touchstart", function(event) {
            $("input#inputfield").on("input", function( event ) {
                var value = $("input#inputfield").val();

                if (value.indexOf(" ") != -1) {
                    android_spacebar = 1;
                } else {
                    android_spacebar = 0;
                }
            });
        });

        $inputfield.keyup(function(event) {
            if ( loading == 0 && event.which != 116) {
                start_countdown();
            }

            $reloadBtn.show();

            $row1_span_wordnr = $('#row1 span[wordnr="'+word_pointer+'"]');

            if(event.which == 8)
            {
                backspace_counter++;
            }

            if(event.which == input_key_value && $inputfield.val() == ' ')
            {
                $inputfield.val('');
            }
            else if (event.which == input_key_value && loading == 0 || android_spacebar == 1) { //event.which == 32 => SPACE-Taste

                //evaluate
                var eingabe = $inputfield.val().split(" ");
                user_input_stream += eingabe[0]+" ";

                $row1_span_wordnr.removeClass('highlight-wrong');

                if(eingabe[0] == words[word_pointer])
                {
                    $row1_span_wordnr.removeClass('highlight').addClass('correct');
                    result_correct++;
                    result_keystrokes_correct += words[word_pointer].length;
                    result_keystrokes_correct++; //für jedes SPACE
                }
                else
                {
                    $row1_span_wordnr.removeClass('highlight').addClass('wrong');
                    result_wrong++;
                    result_keystrokes_wrong += words[word_pointer].length;
                }

                //process
                word_pointer++;
                $row1_span_wordnr = $('#row1 span[wordnr="'+word_pointer+'"]');

                $row1_span_wordnr.addClass('highlight');

                p = $row1_span_wordnr.position();

                if(p.top > previous_position_top + 10) //"+ 5 ist die Toleranz, damit der Zeilensprung auch funktioniert, wenn User die Schriftart grÃ¶ÃŸer gestellt hat, etc."
                {
                    row_counter++;
                    previous_position_top = p.top;

                    var zeilensprung_hoehe = (-1 * line_height) * row_counter;
                    $row1.css('top', zeilensprung_hoehe+"px"); //bei einem zeilensprung wird der text um "line_height" verschoben
                    $row1_span_wordnr.addClass('highlight');
                }

                //erase
                $("#inputstream").text(user_input_stream);
                $inputfield.val(eingabe[1]);
            } else {
                //prÃ¼fe ob user das wort gerade falsch schreibt (dann zeige es rot an, damit user direkt korrigieren kann)
                if($inputfield.val().replace(/\s/g, '') == words[word_pointer].substr(0, $inputfield.val().length))
                    $row1_span_wordnr.removeClass('highlight-wrong').addClass('highlight');
                else
                    $row1_span_wordnr.removeClass('highlight').addClass('highlight-wrong');
            }

        });
    }

    //zÃ¤hlt die Zeit runter und stoppt den Speedtest
    function start_countdown() {
        if(cd_started == 0)
        {
            cd_started = 1;
            setval = window.setInterval(count_down, 1000);
        }
    }

    //zÃ¤hlt die Zeit runter
    function count_down() {
        countdown--;

        var first_part;
        var second_part;

        first_part = Math.floor(countdown / 60);
        second_part = countdown % 60;

        //if(second_part < 10)
        // second_part = '0'+second_part;

        if(second_part < 10)
            second_part = "0"+second_part;

        if(countdown > 0)
        {
            $("#timer").text(first_part+":"+second_part);
        } else {
            $("#timer").text("0:00");
            $("#timer").addClass("off");
           // $("#row1").hide();
           // $("#words").fadeOut();
$("#inputfield").hide();
            window.clearInterval(setval);
            setval = "";

            //var send_data = "&wordlist="+$("#wordlist").text()+"&user_input="+user_input_stream+"&backspace_counter="+backspace_counter+"&speedtest_id="+$("#speedtest-id").attr("value")+"&mode="+$("#speedtest_mode").attr("value");

            //wordlist
            //user_input
            //backspace_counter
            //speedtest_id

            $("#result-load-indicator").show();

            auswertung();
        }
    }

    function auswertung() {
        wpm_calc = Math.round(result_keystrokes_correct / 5);

       // $("#result-table #wpm strong").text(Math.round(wpm_calc/ (param_duration / 30)) + " Words Per 30Seconduuui");
  
   $("#result-table #wpm strong").text(Math.round(wpm_calc/ (param_duration / 30)) + " WPM");
      
  $("#result-table #wpm strong").text(Math.round(result_correct)  + "WPM");
  
        $("#result-table #keystrokes span.correct").text(result_keystrokes_correct);
        $("#result-table #keystrokes span.wrong").text(result_keystrokes_wrong);
        $("#result-table #keystrokes span.all").text(result_keystrokes_correct + result_keystrokes_wrong);
        $("#result-table #correct td.value").text(result_correct);
        $("#result-table #wrong td.value").text(result_wrong);

        $("#auswertung-result").fadeIn();
    }


    //String "Trim" Function
    function trim11 (str) {
        str = str.replace(/^\s+/, '');
        for (var i = str.length - 1; i >= 0; i--) {
            if (/\S/.test(str.charAt(i))) {
                str = str.substring(0, i + 1);
                break;
            }
        }
        return str;
    }

    //befÃ¼llt #row1 und #row2 mit neuen WÃ¶rtern
    function fill_line_switcher() {
        for(i=0; i < words.length; i++)
            row1_string += '<span wordnr="'+i+'" class="">'+words[i].replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')+'</span> '; //classes = NONE, green, red, highlight

            //row1_string += '<span wordnr="'+i+'" class="">'+words[i]+'</span> '; //classes = NONE, green, red, highlight

        $("#row1").html(row1_string);

        $("#row1 span:first").addClass('highlight');
    }

    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    function GetURLParameter(sParam)
    {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++)
        {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam)
            {
                return sParameterName[1];
            }
        }
    }
