[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputCsvPath,

    [Parameter(Mandatory = $true)]
    [string]$SchemaPath,

    [Parameter(Mandatory = $true)]
    [string]$CamposCondicionPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [string]$ConfigPath = (Join-Path $PSScriptRoot 'Generate-EglobalJson.config.json'),

    [string]$FechaInicio = '2026-05-12',

    [string]$FechaFin = '2026-12-12',

    [int]$Prioridad = 1,

    [datetime]$RequestTimestamp = (Get-Date)
)

$ErrorActionPreference = 'Stop'

$culture = [System.Globalization.CultureInfo]::GetCultureInfo('es-AR')
$textInfo = $culture.TextInfo
$defaultForbiddenConditionIds = @(3, 4, 29, 31, 32)
$defaultConditionIds = @(1, 2, 9, 12, 16, 17, 18)
$defaultAltaFields = @(
    'idRequest', 'adquirente', 'idTipoPricing', 'subtipo', 'prioridad',
    'fechaInicio', 'fechaFin', 'tasaCredito', 'tasaDebito', 'tasaPrepago',
    'tasaCreditoDls', 'tasaDebitoDls', 'tasaPrepagoDls', 'descripcion',
    'tipoPricing', 'aplicacion', 'condicion'
)

function To-Array {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    return @($Value)
}

function Get-ConfigValue {
    param(
        $Object,
        [string]$PropertyName,
        $DefaultValue = $null
    )

    if ($null -eq $Object) {
        return $DefaultValue
    }

    $property = $Object.PSObject.Properties[$PropertyName]
    if ($null -eq $property) {
        return $DefaultValue
    }

    return $property.Value
}

function Get-RowValue {
    param(
        $Row,
        [string]$HeaderName
    )

    $expectedHeader = Normalize-ComparisonText $HeaderName
    foreach ($property in $Row.PSObject.Properties) {
        if ((Normalize-ComparisonText $property.Name) -eq $expectedHeader) {
            return $property.Value
        }
    }

    throw "No se encontro la columna '$HeaderName' en el CSV."
}

function Assert-PathExists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Label no existe: $Path"
    }
}

function Normalize-Whitespace {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) {
        return $null
    }

    return (($Value -replace '\s+', ' ').Trim())
}

function To-Display-Text {
    param([AllowNull()][string]$Value)

    $clean = Normalize-Whitespace $Value
    if ([string]::IsNullOrWhiteSpace($clean)) {
        return $clean
    }

    return $textInfo.ToTitleCase($clean.ToLower($culture))
}

function Normalize-ComparisonText {
    param([AllowNull()][string]$Value)

    $clean = Normalize-Whitespace $Value
    if ([string]::IsNullOrWhiteSpace($clean)) {
        return $clean
    }

    $normalized = $clean.Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder

    foreach ($char in $normalized.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($char) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }

    return $builder.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
}

function Get-TipoPricingId {
    param([string]$Tipo)

    switch (Normalize-ComparisonText $Tipo) {
        'default' { return 1 }
        'regulada' { return 2 }
        'variable' { return 3 }
        default { throw "Tipo no soportado: $Tipo" }
    }
}

function Get-TipoTarjeta {
    param([string]$MedioPago)

    $normalized = Normalize-ComparisonText $MedioPago
    if ($normalized -match 'credito') {
        return 'c'
    }

    if ($normalized -match 'debito') {
        return 'd'
    }

    if ($normalized -match 'prepaga|prepago') {
        return 'p'
    }

    throw "No se pudo determinar el tipo de tarjeta para: $MedioPago"
}

function Get-Jurisdiccion {
    param([string]$MedioPago)

    $normalized = Normalize-ComparisonText $MedioPago
    if ($normalized -match 'internacional') {
        return 'I'
    }

    if ($normalized -match 'nacional') {
        return 'L'
    }

    return $null
}

function Get-SegmentoId {
    param([string]$Segmento)

    switch (Normalize-ComparisonText $Segmento) {
        'chico' { return '1' }
        'mediano' { return '2' }
        'grande' { return '3' }
        default { throw "Segmento no soportado: $Segmento" }
    }
}

function Get-RateString {
    param([string]$FeeText)

    $fee = [decimal]::Parse((Normalize-Whitespace $FeeText), [System.Globalization.CultureInfo]::InvariantCulture)
    return [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, '{0:0.00000}', ($fee / 100))
}

function Get-DescriptionPayment {
    param([string]$MedioPago)

    $clean = Normalize-Whitespace $MedioPago
    $clean = $clean -replace '^(?i)tarjeta\s+de\s+', ''
    $clean = $clean -replace '^(?i)tarjeta\s+', ''
    return To-Display-Text $clean
}

function Get-RequiredSchemaFields {
    param($SchemaDocument)

    $altaField = $SchemaDocument.fields | Where-Object { $_.name -eq 'alta' } | Select-Object -First 1
    if ($null -eq $altaField) {
        throw 'El esquema no contiene el campo alta.'
    }

    $altaRecord = $altaField.children | Where-Object { $_.name -eq 'alta_item' } | Select-Object -First 1
    if ($null -eq $altaRecord) {
        throw 'El esquema no contiene el record alta_item.'
    }

    return @($altaRecord.children | ForEach-Object { $_.name })
}

function Get-MandatorySchemaFields {
    param($SchemaDocument)

    $altaField = $SchemaDocument.fields | Where-Object { $_.name -eq 'alta' } | Select-Object -First 1
    if ($null -eq $altaField) {
        throw 'El esquema no contiene el campo alta.'
    }

    $altaRecord = $altaField.children | Where-Object { $_.name -eq 'alta_item' } | Select-Object -First 1
    if ($null -eq $altaRecord) {
        throw 'El esquema no contiene el record alta_item.'
    }

    return @($altaRecord.children | Where-Object { $_.mandatory -eq $true } | ForEach-Object { $_.name })
}

function Get-AllowedConditionIds {
    param(
        [object[]]$CamposCondicionRows,
        [int[]]$SelectableConditionIds
    )

    return @(
        $CamposCondicionRows |
            ForEach-Object { [int](Normalize-Whitespace $_.'ID Campo') } |
            Where-Object { $SelectableConditionIds -contains $_ }
    )
}

function New-OrderedObject {
    param(
        [hashtable]$Source,
        [string[]]$IncludedFields
    )

    $result = [ordered]@{}
    foreach ($fieldName in $IncludedFields) {
        if ($Source.ContainsKey($fieldName)) {
            $result[$fieldName] = $Source[$fieldName]
        }
    }

    return $result
}

function Apply-Overrides {
    param(
        [hashtable]$Source,
        $Overrides
    )

    if ($null -eq $Overrides) {
        return $Source
    }

    foreach ($property in To-Array $Overrides.PSObject.Properties) {
        $Source[$property.Name] = $property.Value
    }

    return $Source
}

Assert-PathExists -Path $InputCsvPath -Label 'InputCsvPath'
Assert-PathExists -Path $SchemaPath -Label 'SchemaPath'
Assert-PathExists -Path $CamposCondicionPath -Label 'CamposCondicionPath'
Assert-PathExists -Path $ConfigPath -Label 'ConfigPath'

$rows = @(Import-Csv -Path $InputCsvPath)
$schema = Get-Content -Raw -Path $SchemaPath | ConvertFrom-Json
$camposCondicion = @(Import-Csv -Path $CamposCondicionPath)
$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

$validationConfig = Get-ConfigValue -Object $config -PropertyName 'validation'
$outputConfig = Get-ConfigValue -Object $config -PropertyName 'output'
$rootConfig = Get-ConfigValue -Object $outputConfig -PropertyName 'root'
$altaConfig = Get-ConfigValue -Object $outputConfig -PropertyName 'alta'
$condicionConfig = Get-ConfigValue -Object $outputConfig -PropertyName 'condicion'

$validateSchema = [bool](Get-ConfigValue -Object $validationConfig -PropertyName 'validateAgainstSchema' -DefaultValue $true)
$includeAccion = [bool](Get-ConfigValue -Object $rootConfig -PropertyName 'includeAccion' -DefaultValue $true)
$accionValue = Get-ConfigValue -Object $rootConfig -PropertyName 'accionValue' -DefaultValue 1
$includedAltaFields = @((To-Array (Get-ConfigValue -Object $altaConfig -PropertyName 'includeFields' -DefaultValue $defaultAltaFields)) | ForEach-Object { [string]$_ })
$conditionIdsToGenerate = @((To-Array (Get-ConfigValue -Object $condicionConfig -PropertyName 'includeIds' -DefaultValue $defaultConditionIds)) | ForEach-Object { [int]$_ })
$forbiddenConditionIds = @((To-Array (Get-ConfigValue -Object $condicionConfig -PropertyName 'forbiddenIds' -DefaultValue $defaultForbiddenConditionIds)) | ForEach-Object { [int]$_ })
$fixedValues = Get-ConfigValue -Object $altaConfig -PropertyName 'fixedValues'

if ($includedAltaFields.Count -eq 0) {
    throw 'La configuracion debe incluir al menos un campo de alta.'
}

if ($conditionIdsToGenerate.Count -eq 0 -and $includedAltaFields -contains 'condicion') {
    throw 'La configuracion incluye condicion pero no define ningun idCampo a generar.'
}

$schemaFields = Get-RequiredSchemaFields -SchemaDocument $schema
$mandatorySchemaFields = Get-MandatorySchemaFields -SchemaDocument $schema
$missingSchemaFields = @($defaultAltaFields | Where-Object { $schemaFields -notcontains $_ })

if ($missingSchemaFields.Count -gt 0) {
    throw "Faltan campos esperados en el esquema: $($missingSchemaFields -join ', ')"
}

$unknownAltaFields = @($includedAltaFields | Where-Object { $schemaFields -notcontains $_ })
if ($unknownAltaFields.Count -gt 0) {
    throw "La configuracion contiene campos de alta desconocidos: $($unknownAltaFields -join ', ')"
}

if ($validateSchema) {
    if (-not $includeAccion) {
        throw 'La configuracion no puede omitir accion cuando validateAgainstSchema = true.'
    }

    $missingMandatoryOutputFields = @($mandatorySchemaFields | Where-Object { $includedAltaFields -notcontains $_ })
    if ($missingMandatoryOutputFields.Count -gt 0) {
        throw "La configuracion omite campos obligatorios del esquema: $($missingMandatoryOutputFields -join ', ')"
    }
}

$allowedConditionIds = Get-AllowedConditionIds -CamposCondicionRows $camposCondicion -SelectableConditionIds $conditionIdsToGenerate
$missingConditionDefinitions = @($conditionIdsToGenerate | Where-Object { $allowedConditionIds -notcontains $_ })
if ($missingConditionDefinitions.Count -gt 0) {
    throw "CamposCondicion no define estos IDs requeridos: $($missingConditionDefinitions -join ', ')"
}

$forbiddenRequestedIds = @($conditionIdsToGenerate | Where-Object { $forbiddenConditionIds -contains $_ })
if ($forbiddenRequestedIds.Count -gt 0) {
    throw "La configuracion intenta generar IDs prohibidos en condicion: $($forbiddenRequestedIds -join ', ')"
}

$requestPrefix = Get-Date -Date $RequestTimestamp -Format 'yyyyMMddHHmmss'

$resolvedFechaInicio = if ($PSBoundParameters.ContainsKey('FechaInicio')) { $FechaInicio } else { [string](Get-ConfigValue -Object $fixedValues -PropertyName 'fechaInicio' -DefaultValue '2026-05-12') }
$resolvedFechaFin = if ($PSBoundParameters.ContainsKey('FechaFin')) { $FechaFin } else { [string](Get-ConfigValue -Object $fixedValues -PropertyName 'fechaFin' -DefaultValue '2026-12-12') }
$resolvedPrioridad = if ($PSBoundParameters.ContainsKey('Prioridad')) { $Prioridad } else { [int](Get-ConfigValue -Object $fixedValues -PropertyName 'prioridad' -DefaultValue 1) }
$resolvedAdquirente = [string](Get-ConfigValue -Object $fixedValues -PropertyName 'adquirente' -DefaultValue '02')
$resolvedSubtipo = [string](Get-ConfigValue -Object $fixedValues -PropertyName 'subtipo' -DefaultValue 'G')
$resolvedTipoPricing = [string](Get-ConfigValue -Object $fixedValues -PropertyName 'tipoPricing' -DefaultValue 'T')
$resolvedAplicacion = [string](Get-ConfigValue -Object $fixedValues -PropertyName 'aplicacion' -DefaultValue 'U')

$alta = for ($index = 0; $index -lt $rows.Count; $index++) {
    $row = $rows[$index]
    $rubro = Normalize-Whitespace (Get-RowValue -Row $row -HeaderName 'Codigo de Rubro  (Giros)')
    $mcc = Normalize-Whitespace (Get-RowValue -Row $row -HeaderName 'MCC  (Merchant Category code)')
    $descripcionRubro = To-Display-Text (Get-RowValue -Row $row -HeaderName 'Descripcion del Rubro')
    $segmento = To-Display-Text (Get-RowValue -Row $row -HeaderName 'Segmento')
    $plazoAcreditacion = Normalize-Whitespace (Get-RowValue -Row $row -HeaderName 'Plazo de acreditacion')
    $medioPago = Normalize-Whitespace (Get-RowValue -Row $row -HeaderName 'Medio de Pago')
    $tipo = Normalize-Whitespace (Get-RowValue -Row $row -HeaderName 'Tipo')
    $tipoTarjeta = Get-TipoTarjeta $medioPago
    $jurisdiccion = Get-Jurisdiccion $medioPago
    $segmentoId = Get-SegmentoId (Get-RowValue -Row $row -HeaderName 'Segmento')
    $rate = Get-RateString (Get-RowValue -Row $row -HeaderName 'Fee')

    $conditionCandidates = [ordered]@{
        '1' = $rubro.PadLeft(8, '0')
        '2' = $mcc.PadLeft(4, '0')
        '9' = $tipoTarjeta
        '12' = '032'
        '16' = $jurisdiccion
        '17' = $plazoAcreditacion
        '18' = $segmentoId
    }

    $condicion = New-Object System.Collections.ArrayList
    foreach ($conditionId in $conditionIdsToGenerate) {
        $conditionKey = [string]$conditionId
        if ($conditionCandidates.Contains($conditionKey)) {
            $conditionValue = $conditionCandidates[$conditionKey]
            if ($null -ne $conditionValue) {
                [void]$condicion.Add([ordered]@{ idCampo = $conditionId; valorCondicion = [string]$conditionValue })
            }
        }
    }

    $conditionIds = @($condicion | ForEach-Object { [int]$_.idCampo })
    $invalidConditionIds = @($conditionIds | Where-Object { $forbiddenConditionIds -contains $_ })
    if ($invalidConditionIds.Count -gt 0) {
        throw "Se generaron IDs prohibidos en condicion: $($invalidConditionIds -join ', ')"
    }

    $altaItem = [ordered]@{
        idRequest = ('{0}{1:d6}' -f $requestPrefix, ($index + 1))
        adquirente = $resolvedAdquirente
        idTipoPricing = Get-TipoPricingId $tipo
        subtipo = $resolvedSubtipo
        prioridad = $resolvedPrioridad
        fechaInicio = $resolvedFechaInicio
        fechaFin = $resolvedFechaFin
        tasaCredito = $rate
        tasaDebito = $rate
        tasaPrepago = $rate
        tasaCreditoDls = $null
        tasaDebitoDls = $null
        tasaPrepagoDls = $null
        descripcion = ('{0} - Segmento {1} - {2}' -f $descripcionRubro, $segmento, (Get-DescriptionPayment $medioPago))
        tipoPricing = $resolvedTipoPricing
        aplicacion = $resolvedAplicacion
        condicion = $condicion
    }

    $altaItem = Apply-Overrides -Source $altaItem -Overrides (Get-ConfigValue -Object $altaConfig -PropertyName 'perRecordOverrides')
    New-OrderedObject -Source $altaItem -IncludedFields $includedAltaFields
}

$document = [ordered]@{}
if ($includeAccion) {
    $document['accion'] = $accionValue
}
$document['alta'] = $alta

$outputDirectory = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDirectory) -and -not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -Path $outputDirectory -ItemType Directory -Force | Out-Null
}

$document | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding utf8

$idRequests = @($alta | ForEach-Object { $_.idRequest })
$uniqueIdRequests = @($idRequests | Sort-Object -Unique)

if ($idRequests.Count -ne $uniqueIdRequests.Count) {
    throw 'Se detectaron idRequest duplicados en la salida generada.'
}

Write-Output "Archivo generado: $OutputPath"
Write-Output "Registros alta: $($alta.Count)"
Write-Output "Primer idRequest: $($alta[0].idRequest)"
Write-Output "Ultimo idRequest: $($alta[-1].idRequest)"