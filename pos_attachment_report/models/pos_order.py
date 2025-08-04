from odoo import models,fields,api
import logging
import base64
_logger=logging.getLogger(__name__)

class PosOrder(models.Model):
    _inherit='pos.order'

    is_a5_invoice=fields.Boolean(string="")

    @api.model
    def create(self, vals):
        order = super(PosOrder, self).create(vals)
        _logger.info("########################### called *******************")
        # Check if A5 invoice should be printed
        report_action = self.env.ref('pos_attachment_report.report_pos_invoice_a5')  
        report_action.report_action(order)

        _logger.info("=========== Report generated and attached ============")

        _logger.info(f"===================== after called  {report_action} =========")
       
        return order