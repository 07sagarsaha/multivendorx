jQuery(function($){
    // Fetch reasons dynamically on form open
    $(document).on('click', '.open-report-abuse', function(e){
        e.preventDefault();
        var $form = $(this).siblings('.report-abuse-form');
        $form.toggle();

        var $wrapper = $form.find('.report_abuse_reasons_wrapper');

        // If not already loaded, fetch reasons
        if($wrapper.children().length === 0){
            $.ajax({
                url: reportAbuseFrontend.ajaxurl,
                type: 'POST',
                data: { action: 'get_report_reasons' },
                success: function(res){
                    if(res.success){
                        $.each(res.data, function(i, reason){
                            var radio = '<p><label><input type="radio" name="report_abuse_reason_'+$form.find('.report_abuse_product_id').val()+'" value="'+reason+'"> '+reason+'</label></p>';
                            $wrapper.append(radio);
                        });
                    }
                }
            });
        }
    });

    // Show/hide custom message textarea if "Other" is selected
    $(document).on('change', '.report_abuse_reasons_wrapper input[type=radio]', function(){
        var $form = $(this).closest('.report-abuse-form');
        if ($(this).val().toLowerCase() === 'other') {
            $form.find('.report-abuse-custom-msg').show();
        } else {
            $form.find('.report-abuse-custom-msg').hide();
        }
    });

    // Submit abuse report
    $(document).on('click', '.submit-report-abuse', function(e){
        e.preventDefault();
        var $btn = $(this);
        if ($btn.prop('disabled')) return;

        var $form = $btn.closest('.report-abuse-form');
        var name  = $form.find('.report_abuse_name').val();
        var email = $form.find('.report_abuse_email').val();
        var reason = $form.find('.report_abuse_reasons_wrapper input[type=radio]:checked').val();
        var msg   = (reason === 'Other') ? $form.find('.report_abuse_msg').val() : reason;
        var pid   = $form.find('.report_abuse_product_id').val();
        var $msgBox = $form.find('.report-abuse-msg-box');

        if(!name || !email || !reason || !msg){
            $msgBox.html('<span style="color:red;">All fields are required.</span>');
            return;
        }

        $btn.prop('disabled', true);
        $btn.find('.btn-text').hide();
        $btn.find('.btn-spinner').show();

        $.ajax({
            url: reportAbuseFrontend.ajaxurl,
            type: 'POST',
            data: {
                action: 'mvx_submit_report_abuse',
                nonce: reportAbuseFrontend.nonce,
                name: name,
                email: email,
                message: msg,
                product_id: pid
            },
            success: function(res){
                if(res.success){
                    $btn.replaceWith('<span class="report-sent" style="color:green; font-weight:bold;">Report has been sent ✅</span>');
                    $msgBox.html('<span style="color:green;">'+res.data+'</span>');
                } else {
                    $msgBox.html('<span style="color:red;">'+res.data+'</span>');
                    $btn.prop('disabled', false);
                    $btn.find('.btn-text').show();
                    $btn.find('.btn-spinner').hide();
                }
            },
            error: function(){
                $msgBox.html('<span style="color:red;">Something went wrong. Try again.</span>');
                $btn.prop('disabled', false);
                $btn.find('.btn-text').show();
                $btn.find('.btn-spinner').hide();
            }
        });
    });
});
