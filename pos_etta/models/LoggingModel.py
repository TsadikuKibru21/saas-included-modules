from odoo import fields, models,api
import logging

class LoggingMixin(models.AbstractModel):
    _name = 'logging.mixin'
    _description = 'Logging Mixin'

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        record_to_insert = vals_list[0]
        
        for record in records:
            self.env['logging.event.model'].create({
                'model_name': self._name,
                'record_id': record.id,
                'action_type': 'create',
                'log': f"Created:{record.id}:{record.name}",
            })
        return records

    def write(self, vals):
        pre_update_values = self.read(list(vals.keys()))
        result = super().write(vals)
        logging.info(pre_update_values)

        if result:
            for record, pre_vals in zip(self, pre_update_values):
                log_details = []

            # For any changes, create a basic log entry
                basic_log_msg = f"Edit: {self._name} ID {record.id} '{record.name}' - General changes {str(vals)}"
                log_details.append(basic_log_msg)

            # Specific logging for product.template model and taxes_id changes
                if self._name == 'product.template' and 'taxes_id' in vals:
                    new_taxes = self.env['account.tax'].browse(record.taxes_id.ids)
                    old_taxes_ids = pre_vals.get('taxes_id', [])
                    old_taxes = self.env['account.tax'].browse(old_taxes_ids)

                    if set(new_taxes.ids) != set(old_taxes_ids):
                        tax_changes = f"Old Taxes: {[tax.name + ' (' + str(tax.amount) + '%)' for tax in old_taxes]}, " \
                                  f"New Taxes: {[tax.name + ' (' + str(tax.amount) + '%)' for tax in new_taxes]}"
                        tax_log_msg = f"Specific Change - Taxes Changed: {tax_changes}"
                        log_details.append(tax_log_msg)

            
                elif self._name == 'account.tax' and 'amount' in vals:
                    old_amount = pre_vals.get('amount')
                    new_amount = vals.get('amount')
                    if old_amount != new_amount:
                        amount_change_log = f"Specific Change - Amount Changed: {old_amount} -> {new_amount}"
                        log_details.append(amount_change_log)

            # Create a single log entry for all changes
            final_log_msg = " | ".join(log_details)
            self.env['logging.event.model'].create({
                'model_name': self._name,
                'record_id': record.id,
                'action_type': 'write',
                'log': final_log_msg,
            })

        return result



class LogginModel(models.Model):
    _name="logging.event.model"
    _description = "logging important events"
    record_id = fields.Integer()
    log = fields.Text(string="log")
    model_name = fields.Char()
    timestamp = fields.Datetime(
        string='TimeStamp',
        default=fields.Datetime.now,
        required=True
        )
    action_type = fields.Selection([
        ('create', 'Create'),
        ('write', 'Write'),
        ('unlink', 'Delete'),
    ], string='Action Type')
    def create_log_entry(self,log_entry,action,model_name):
        self.create({
            "log":log_entry,
            "action_type":action,
            "model_name":model_name
            })

class LogTaxes(models.Model):
    _name = 'account.tax'
    _inherit = ["account.tax","logging.mixin"]

    
class LogProducts(models.Model):
    _name = 'product.template'
    _inherit = ['product.template','logging.mixin']



