odoo.define('l10n_do_pos.screens', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var rpc = require('web.rpc');
    // var screens_return = require('pos_orders_history_return.screens');
    var core = require('web.core');
    var _t = core._t;

    // screens.ActionpadWidget.include({
    //     renderElement: function () {
    //         this._super();
    //         var current_order = this.pos.get_order();
    //         if (current_order) {
    //             if (current_order.get_mode() === 'return' &&
    //                 this.pos.invoice_journal.l10n_do_fiscal_journal) {
    //                 this.$('.set-customer').addClass('disable');
    //             } else {
    //                 this.$('.set-customer').removeClass('disable');
    //             }
    //         }
    //     },
    // });

    // screens.OrdersHistoryButton.include({
    //     button_click: function () {
    //         if (this.pos.invoice_journal.l10n_do_fiscal_journal &&
    //             !this.pos.config.load_barcode_order_only) {
    //
    //             this.gui.show_popup('error', {
    //                 'title': _t('Config'),
    //                 'body': _t('Please active Load Specific Orders only it ' +
    //                     'on point of sale config'),
    //             });
    //
    //         } else {
    //             this.pos.db.pos_orders_history = [];
    //             this.pos.db.pos_orders_history_lines = [];
    //             this.pos.db.sorted_orders = [];
    //             this.pos.db.line_by_id = [];
    //             this.pos.db.lines_by_id = [];
    //             this.pos.db.orders_history_by_id = [];
    //             this._super();
    //         }
    //
    //     },
    // });

    screens.PaymentScreenWidget.include({

        // customer_changed: function () {
        //     this._super.apply(this, arguments);
        //     var client = this.pos.get_client();
        //     var current_order = this.pos.get_order();
            // if (client) {
            //
            //     if (client.sale_fiscal_type_id &&
            //         current_order.fiscal_type.prefix === 'B02') {
            //         current_order.set_latam_document_type(
            //             this.pos.get_fiscal_type_by_id(
            //                 client.sale_fiscal_type_id[0]
            //             )
            //         );
            //     }
            //
            // } else {
            //
            //     current_order.set_latam_document_type(
            //         this.pos.get_latam_document_type_by_prefix('B02')
            //     );
            //
            // }
        // },

        keyboard_off: function () {
            // That one comes from BarcodeEvents
            $('body').keypress(this.keyboard_handler);
            // That one comes from the pos, but we prefer to cover
            // all the basis
            $('body').keydown(this.keyboard_keydown_handler);
        },
        keyboard_on: function () {
            $('body').off('keypress', this.keyboard_handler);
            $('body').off('keydown', this.keyboard_keydown_handler);
        },

        renderElement: function () {
            this._super();
            var self = this;
            var current_order = self.pos.get_order();
            this.$('.js_set_latam_document_type').click(function () {
                self.click_set_latam_document_type();
            });
            // if (current_order) {
            //     if (current_order.get_mode() === 'return' &&
            //         this.pos.invoice_journal.l10n_do_fiscal_journal) {
            //
            //         this.$('.js_set_latam_document_type').addClass('disable');
            //         this.$('.js_set_customer').addClass('disable');
            //         this.$('.input-button').addClass('disable');
            //         this.$('.mode-button').addClass('disable');
            //         this.$('.paymentmethod').addClass('disable');
            //
            //     } else {
            //
            //         this.$('.js_set_latam_document_type').removeClass('disable');
            //         this.$('.js_set_customer').removeClass('disable');
            //         this.$('.input-button').removeClass('disable');
            //         this.$('.mode-button').removeClass('disable');
            //         this.$('.paymentmethod').removeClass('disable');
            //
            //     }
            //     if (this.pos.invoice_journal.l10n_do_fiscal_journal) {
            //
            //         this.$('.js_invoice').hide();
            //
            //     }
            // }

        },

        open_vat_popup: function () {
            var self = this;
            var current_order = self.pos.get_order();

            self.keyboard_on();
            self.gui.show_popup('textinput', {
                'title': _t('You need to select a customer with RNC/Céd for' +
                    ' this fiscal type, place writes RNC/Céd'),
                'vat': '',
                confirm: function (vat) {
                    self.keyboard_off();
                    if (!(vat.length === 9 || vat.length === 11) ||
                        Number.isNaN(Number(vat))) {

                        self.gui.show_popup('error', {
                            'title': _t('This not RNC or Cédula'),
                            'body': _t('Please check if RNC or Cédula is' +
                                ' correct'),
                            cancel: function () {
                                self.open_vat_popup();
                            },
                        });

                    } else {
                        // TODO: in future try optimize search partners
                        // link get_partner_by_id
                        self.keyboard_off();
                        var partner = self.pos.partners.find(
                            function (partner_obj) {
                                return partner_obj.vat === vat;
                            }
                        );
                        if (partner) {
                            current_order.set_client(partner);
                        } else {
                            // TODO: in future create automatic partner
                            self.gui.show_screen('clientlist');
                        }
                    }

                },
                cancel: function () {
                    self.keyboard_off();
                    if (!current_order.get_client()) {
                        current_order.set_latam_document_type(
                            this.pos.get_latam_document_type_by_prefix()
                        );
                    }
                },
            });
        },

        click_set_latam_document_type: function () {
            var self = this;
            var latam_document_type_list = _.map(self.pos.l10n_latam_document_types,
                function (latam_document_type) {
                    if (latam_document_type.internal_type === 'invoice') {
                        return {
                            label: latam_document_type.name,
                            item: latam_document_type,
                        };
                    }
                    return false;
                });

            self.gui.show_popup('selection', {
                title: _t('Select document type'),
                list: latam_document_type_list,
                confirm: function (latam_document_type) {
                    var current_order = self.pos.get_order();
                    var client = self.pos.get_client();
                    current_order.set_latam_document_type(latam_document_type);
                    if (latam_document_type.is_vat_required && !client) {
                        self.open_vat_popup();
                    }
                    if (latam_document_type.is_vat_required && client) {
                        if (!client.vat) {
                            self.open_vat_popup();
                        }
                    }
                },
                is_selected: function (latam_document_type) {
                    var order = self.pos.get_order();
                    return latam_document_type === order.l10n_latam_document_type;
                },
            });
        },

        // analyze_payment_methods: function () {
        //
        //     var current_order = this.pos.get_order();
        //     var total_in_bank = 0;
        //     var has_cash = false;
        //     var all_payment_lines = current_order.get_paymentlines();
        //     var total = current_order.get_total_with_tax();
        //     var has_return_ncf = true;
        //     var payment_and_return_mount_equals = true;
        //
        //
        //     for (var line in all_payment_lines) {
        //         var payment_line = all_payment_lines[line];
        //
        //         if (payment_line.cashregister.journal.type === 'bank') {
        //             total_in_bank = +Number(payment_line.amount);
        //         }
        //         if (payment_line.cashregister.journal.type === 'cash') {
        //             has_cash = true;
        //         }
        //         if (payment_line.cashregister.journal.is_for_credit_notes) {
        //
        //             if (payment_line.get_returned_ncf() === null) {
        //                 has_return_ncf = false;
        //             }
        //
        //             var amount_in_payment_line =
        //                 Math.round(payment_line.amount * 100) / 100;
        //             var amount_in_return_order =
        //                 Math.abs(
        //                     payment_line.get_returned_order_amount() * 100
        //                 ) / 100;
        //
        //             if (amount_in_return_order !== amount_in_payment_line) {
        //                 payment_and_return_mount_equals = false;
        //             }
        //         }
        //     }
        //
        //     if (Math.abs(Math.round(Math.abs(total) * 100) / 100) <
        //         Math.round(Math.abs(total_in_bank) * 100) / 100) {
        //
        //         this.gui.show_popup('error', {
        //             'title': _t('Card payment'),
        //             'body': _t('Card payments cannot exceed the total order'),
        //         });
        //
        //         return false;
        //     }
        //
        //     if (Math.round(Math.abs(total_in_bank) * 100) / 100 ===
        //         Math.round(Math.abs(total) * 100) / 100 && has_cash) {
        //
        //         this.gui.show_popup('error', {
        //             'title': _t('Card and cash payment'),
        //             'body': _t('The total payment with the card is ' +
        //                 'sufficient to pay the order, please eliminate the ' +
        //                 'payment in cash or reduce the amount to be paid by ' +
        //                 'card'),
        //         });
        //
        //         return false;
        //     }
        //
        //     if (!has_return_ncf) {
        //
        //         this.gui.show_popup('error', {
        //             'title': _t('Error in credit note'),
        //             'body': _t('There is an error with the payment of ' +
        //                 'credit note, please delete the payment of the ' +
        //                 'credit note and enter it again.'),
        //         });
        //
        //         return false;
        //
        //     }
        //
        //     if (!payment_and_return_mount_equals) {
        //
        //         this.gui.show_popup('error', {
        //             'title': _t('Error in credit note'),
        //             'body': _t('The amount of the credit note does not ' +
        //                 'correspond, delete the credit note and enter it' +
        //                 ' again.'),
        //         });
        //
        //         return false;
        //     }
        //
        //     return true;
        //
        //
        // },
        //
        order_is_valid: function (force_validation) {

            var self = this;
            var current_order = this.pos.get_order();
            var client = current_order.get_client();
            var total = current_order.get_total_with_tax();
            if(current_order.to_invoice_backend){
                current_order.to_invoice = false;
                current_order.save_to_db();
            }

            if (total === 0) {
                this.gui.show_popup('error', {
                    'title': _t('Sale in'),
                    'body': _t('You cannot make sales in 0, please add a ' +
                        'product with value'),
                });
                return false;
            }

            if (self.pos.invoice_journal.l10n_latam_use_documents &&
                current_order.to_invoice_backend) {

                // if (!self.analyze_payment_methods()) {
                //
                //     return false;
                //
                // }

                if (current_order.l10n_latam_document_type.is_vat_required && !client) {

                    this.gui.show_popup('error', {
                        'title': _t('Required document (RNC/Céd.)'),
                        'body': _t('For invoice fiscal type ' +
                            current_order.fiscal_type.name +
                            ' its necessary customer, please select customer'),
                    });
                    current_order.to_invoice = true;
                    current_order.save_to_db();
                    return false;

                }

                if (current_order.l10n_latam_document_type.is_vat_required &&
                    !client.vat) {

                    this.gui.show_popup('error', {
                        'title': _t('Required document (RNC/Céd.)'),
                        'body': _t('For invoice fiscal type ' +
                            current_order.l10n_latam_document_type.name +
                            ' it is necessary for the customer have ' +
                            'RNC or Céd.'),
                    });
                    current_order.to_invoice = true;
                    current_order.save_to_db();
                    return false;
                }

                if (total >= 250000.00 && (!client || !client.vat)) {
                    this.gui.show_popup('error', {
                        'title': _t('Sale greater than RD$ 250,000.00'),
                        'body': _t('For this sale it is necessary for the ' +
                            'customer have ID'),
                    });
                    current_order.to_invoice = true;
                    current_order.save_to_db();
                    return false;
                }

                // This part is for credit note
                // if (current_order.get_mode() === 'return') {
                //     var origin_order =
                //         self.pos.db.orders_history_by_id[
                //             current_order.return_lines[0].order_id[0]];
                //
                //     if (origin_order.partner_id[0] !== client.id) {
                //         this.gui.show_popup('error', {
                //             'title': _t('Error in credit note'),
                //             'body': _t('The customer of the credit note must' +
                //                 ' be the same as the original'),
                //         });
                //         return false;
                //     }
                // }

            }

            if (this._super(force_validation)) {
                return true
            } else {
                if(current_order.to_invoice_backend){
                    current_order.to_invoice = true;
                    current_order.save_to_db();
                }
                return false
            }

        },
        finalize_validation: function() {
            var self = this;
            var current_order = this.pos.get_order();
            var _super = this._super.bind(this);
            if (current_order.to_invoice_backend &&
                self.pos.invoice_journal.l10n_latam_use_documents &&
                !current_order.l10n_latam_document_number) {
                var latam_sequence =
                    self.pos.get_l10n_latam_sequence_by_document_type_id(
                        current_order.l10n_latam_document_type.id
                    );
                self.pos.loading_screen_on();
                rpc.query({
                    model: 'ir.sequence',
                    method: 'next_by_id',
                    args: [latam_sequence.id],
                }).then(function (res) {
                    self.pos.loading_screen_off();
                    current_order.l10n_latam_document_number = res;
                    current_order.l10n_latam_sequence_id = latam_sequence.id;
                    current_order.l10n_latam_document_type_id = current_order.l10n_latam_document_type.id;
                    current_order.save_to_db();
                    console.log(res);
                    _super();
                    // For credit notes
                    // if (current_order.get_mode() === 'return') {
                    //     var origin_order =
                    //         self.pos.db.orders_history_by_id[
                    //             current_order.return_lines[0].order_id[0]];
                    //     current_order.ncf_l10n_do_origin_ncf = origin_order.ncf;
                    // }
                }, function (err, ev) {
                    self.pos.loading_screen_off();
                    current_order.to_invoice = true;
                    current_order.save_to_db();
                    console.log(err);
                    console.log(ev);
                    ev.preventDefault();
                    var error_body =
                        _t('Your Internet connection is probably down.');
                    if (err.data) {
                        var except = err.data;
                        error_body = except.arguments ||
                            except.message || error_body;
                    }
                    self.gui.show_popup('error', {
                        'title': _t('Error: Could not Save Changes'),
                        'body': error_body,
                    });
                })
            } else {
                this._super();
            }
        },
        // click_paymentmethods: function (id) {
        //     var self = this;
        //     var cashregister = null;
        //     var current_order = self.pos.get_order();
        //
        //     for (var i = 0; i < this.pos.cashregisters.length; i++) {
        //         if (this.pos.cashregisters[i].journal_id[0] === id) {
        //             cashregister = this.pos.cashregisters[i];
        //             break;
        //         }
        //     }
        //
        //     if (cashregister.journal.is_for_credit_notes === true) {
        //         this.keyboard_on();
        //         self.gui.show_popup('textinput', {
        //             title: _t("Enter credit note number"),
        //             confirm: function (input) {
        //                 current_order.add_payment_credit_note(
        //                     input,
        //                     cashregister
        //                 );
        //                 self.keyboard_off();
        //             },
        //             cancel: function () {
        //                 self.keyboard_off();
        //             },
        //         });
        //     } else {
        //         this._super(id);
        //     }
        // },
    });

    // screens_return.OrdersHistoryScreenWidget.include({
    //     load_order_by_barcode: function (barcode) {
    //         var self = this;
    //         var _super = this._super.bind(this);
    //         if (self.pos.config.return_orders &&
    //             self.pos.invoice_journal.l10n_do_fiscal_journal) {
    //             var order_custom = false;
    //             var domain = [
    //                 ['ncf', '=', barcode],
    //                 ['returned_order', '=', false],
    //             ];
    //             var fields = [
    //                 'pos_history_reference_uid',
    //             ];
    //             self.pos.loading_screen_on();
    //             rpc.query({
    //                 model: 'pos.order',
    //                 method: 'search_read',
    //                 args: [domain, fields],
    //                 limit: 1,
    //             }, {
    //                 timeout: 3000,
    //                 shadow: true,
    //             }).then(function (order) {
    //                 order_custom = order;
    //                 self.pos.loading_screen_off();
    //             }, function (err, ev) {
    //                 self.pos.loading_screen_off();
    //                 console.log(err);
    //                 console.log(ev);
    //                 ev.preventDefault();
    //                 var error_body =
    //                     _t('Your Internet connection is probably down.');
    //                 if (err.data) {
    //                     var except = err.data;
    //                     error_body = except.arguments ||
    //                         except.message || error_body;
    //                 }
    //                 self.gui.show_popup('error', {
    //                     'title': _t('Error: Could not Save Changes'),
    //                     'body': error_body,
    //                 });
    //             }).done(function () {
    //                 self.pos.loading_screen_off();
    //                 if (order_custom && order_custom.length) {
    //                     _super(order_custom[0].pos_history_reference_uid);
    //                 } else {
    //                     self.gui.show_popup('error', {
    //                         'title': _t('Error: Could not find the Order'),
    //                         'body': _t('There is no order with this barcode.'),
    //                     });
    //                 }
    //             });
    //         } else {
    //             this._super(barcode);
    //         }
    //     },
    // });
});
