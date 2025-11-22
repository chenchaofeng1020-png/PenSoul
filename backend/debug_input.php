<?php
$input = json_decode(file_get_contents("php://input"), true);
error_log("Received data: " . print_r($input, true));
?>
