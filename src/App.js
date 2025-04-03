// App.js
import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import './App.css';

// Reusable control: shows a label, a number input, and a slider.
function LabeledControl({ label, value, onChange, sliderMin, sliderMax, step }) {
  return (
    <div className="control-group">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
      />
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
      />
    </div>
  );
}

// Cylinder Component with pastel materials and thicker yellow outline for selection
const Cylinder = forwardRef(
  (
    {
      id,
      radiusTop,
      radiusBottom,
      height,
      rotation,
      position,
      materialType,
      onClick,
      isSelected,
    },
    ref
  ) => {
    // Pastel color palette – each color is distinct but harmonious
    const getMaterial = (type) => {
      switch (type) {
        case 'basic':
          return <meshBasicMaterial color="#FAD7A0" />; // Pastel Peach
        case 'phong':
          return <meshPhongMaterial color="#F5CBA7" />; // Pastel Coral
        case 'lambert':
          return <meshLambertMaterial color="#FADBD8" />; // Pastel Pink
        default:
          return <meshStandardMaterial color="#F9E79F" />; // Pastel Yellow
      }
    };

    return (
      <mesh
        ref={ref}
        rotation={rotation}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick(id);
        }}
      >
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 32]} />
        {getMaterial(materialType)}
        {/* Outline edges: thicker yellow outline when selected */}
        <Edges
          threshold={15}
          color={isSelected ? '#ab6036' : 'black'}
          lineWidth={isSelected ? 5 : 1}
        />
      </mesh>
    );
  }
);

// Scene Component renders a cylinder and passes along the selection state.
function Scene({ cylinderProps, cylinderRefSetter, cylinderId, onSelect, isSelected }) {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      cylinderRefSetter(meshRef.current);
    }
  }, [meshRef, cylinderRefSetter]);

  return (
    <Cylinder
      id={cylinderId}
      {...cylinderProps}
      ref={meshRef}
      onClick={onSelect}
      isSelected={isSelected}
    />
  );
}

// Main App Component
function App() {
  const [selectedCylinder, setSelectedCylinder] = useState('cylinder1');
  const [cylinderParams, setCylinderParams] = useState({
    cylinder1: {
      // Both radii are the same now (symmetric)
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [0, 0, 0],
      materialType: 'standard',
    },
    cylinder2: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [2, 0, 0],
      materialType: 'standard',
    },
  });
  const [cylinderMeshes, setCylinderMeshes] = useState({});
  const fileInputRef = useRef(null);
  // For mobile: toggles the display of import/export controls.
  const [showImportExport, setShowImportExport] = useState(false);

  // Update function for Radius: sets both radiusTop and radiusBottom.
  const updateRadius = (value) => {
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        radiusTop: value,
        radiusBottom: value,
      },
    }));
  };

  // Add a new cylinder with default parameters.
  const addCylinder = () => {
    const count = Object.keys(cylinderParams).length;
    const newId = 'cylinder' + (count + 1);
    const defaultPosition = [count * 2, 0, 0];

    setCylinderParams((prev) => ({
      ...prev,
      [newId]: {
        radiusTop: 1,
        radiusBottom: 1,
        height: 2,
        rotation: [0, 0, 0],
        position: defaultPosition,
        materialType: 'standard',
      },
    }));
    setSelectedCylinder(newId);
  };

  // Exports cylinders to a text file.
  const handleExport = () => {
    let exportString = '';
    let index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const [posX, posY, posZ] = params.position;
      const [rotX, rotY] = params.rotation;
      const topDiameter = params.radiusTop * 2;
      const bottomDiameter = params.radiusBottom * 2;

      exportString += `rcc ${index} ${posX} ${posY} ${posZ} ${rotX} ${rotY} ${topDiameter} ${bottomDiameter}\n`;
      index++;
    }
    exportString += 'end body\n';
    index = 1;
    for (const id of Object.keys(cylinderParams)) {
      exportString += `zn${index} ${index}\n`;
      index++;
    }
    exportString += 'end zone\n';
    exportString += '1 2 2 1000 0\n';
    exportString += 'end geom\n';

    const blob = new Blob([exportString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.txt';
    link.click();
  };

  // Trigger hidden file input for importing.
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Reads and parses the imported file.
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      let newCylinderParams = {};
      let index = 1;
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('rcc')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const posX = parseFloat(parts[2]);
            const posY = parseFloat(parts[3]);
            const posZ = parseFloat(parts[4]);
            const rotX = parseFloat(parts[5]);
            const rotY = parseFloat(parts[6]);
            const topDiameter = parseFloat(parts[7]);
            const bottomDiameter = parseFloat(parts[8]);
            newCylinderParams[`cylinder${index}`] = {
              radiusTop: topDiameter / 2,
              radiusBottom: bottomDiameter / 2,
              height: 2,
              rotation: [rotX, rotY, 0],
              position: [posX, posY, posZ],
              materialType: 'standard',
            };
            index++;
          }
        }
      }
      if (Object.keys(newCylinderParams).length > 0) {
        setCylinderParams(newCylinderParams);
        setSelectedCylinder('cylinder1');
      } else {
        alert('No valid cylinder data found in the file.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Helpers to update other parameters.
  const updateParam = (key, value) => {
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        [key]: value,
      },
    }));
  };

  const updateRotation = (axisIndex, value) => {
    const newRotation = [...cylinderParams[selectedCylinder].rotation];
    newRotation[axisIndex] = value;
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        rotation: newRotation,
      },
    }));
  };

  const updatePosition = (axisIndex, value) => {
    const newPosition = [...cylinderParams[selectedCylinder].position];
    newPosition[axisIndex] = value;
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        position: newPosition,
      },
    }));
  };

  const updateMaterialType = (e) => {
    setCylinderParams((prev) => ({
      ...prev,
      [selectedCylinder]: {
        ...prev[selectedCylinder],
        materialType: e.target.value,
      },
    }));
  };

  const handleCylinderSelect = (cylinderId) => {
    setSelectedCylinder(cylinderId);
  };

  return (
    <div className="app-container">
      {/* Mobile toggle button for Import/Export */}
      <div
        className="import-export-toggle"
        onClick={() => setShowImportExport(!showImportExport)}
      >
        {showImportExport ? '-' : '+'}
      </div>

      {/* Import/Export container; on mobile it toggles under the toggle button */}
      <div className={`export-import-container ${showImportExport ? 'active' : ''}`}>
        <button className="import-btn" onClick={handleImportClick}>
          Import
        </button>
        <button className="export-btn" onClick={handleExport}>
          Export All Cylinders
        </button>
      </div>
      <input
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileImport}
      />

      {/* Sidebar with controls */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Cylinder Controls</h2>
        </div>
        <div className="control-group">
          <label>Select Cylinder:</label>
          <select
            value={selectedCylinder}
            onChange={(e) => setSelectedCylinder(e.target.value)}
          >
            {Object.keys(cylinderParams).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        {/* Geometry Controls */}
        <div className="control-section">
          <h3>Geometry</h3>
          <LabeledControl
            label="Radius:"
            value={cylinderParams[selectedCylinder].radiusTop}
            onChange={updateRadius}
            sliderMin={0.1}
            sliderMax={5}
            step={0.1}
          />
          <LabeledControl
            label="Height:"
            value={cylinderParams[selectedCylinder].height}
            onChange={(v) => updateParam('height', v)}
            sliderMin={0}
            sliderMax={20}
            step={0.1}
          />
        </div>

        {/* Rotation Controls */}
        <div className="control-section">
          <h3>Rotation</h3>
          <LabeledControl
            label="Rotation X:"
            value={cylinderParams[selectedCylinder].rotation[0]}
            onChange={(v) => updateRotation(0, v)}
            sliderMin={-180}
            sliderMax={180}
            step={0.1}
          />
          <LabeledControl
            label="Rotation Y:"
            value={cylinderParams[selectedCylinder].rotation[1]}
            onChange={(v) => updateRotation(1, v)}
            sliderMin={-180}
            sliderMax={180}
            step={0.1}
          />
          <LabeledControl
            label="Rotation Z:"
            value={cylinderParams[selectedCylinder].rotation[2]}
            onChange={(v) => updateRotation(2, v)}
            sliderMin={-180}
            sliderMax={180}
            step={0.1}
          />
        </div>

        {/* Position Controls */}
        <div className="control-section">
          <h3>Position</h3>
          <LabeledControl
            label="Offset X:"
            value={cylinderParams[selectedCylinder].position[0]}
            onChange={(v) => updatePosition(0, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
          <LabeledControl
            label="Offset Y:"
            value={cylinderParams[selectedCylinder].position[1]}
            onChange={(v) => updatePosition(1, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
          <LabeledControl
            label="Offset Z:"
            value={cylinderParams[selectedCylinder].position[2]}
            onChange={(v) => updatePosition(2, v)}
            sliderMin={-20}
            sliderMax={20}
            step={0.1}
          />
        </div>

        {/* Material Control */}
        <div className="control-section">
          <h3>Material</h3>
          <div className="control-group">
            <label>Material:</label>
            <select
              value={cylinderParams[selectedCylinder].materialType}
              onChange={updateMaterialType}
            >
              <option value="standard">Standard (Pastel Yellow)</option>
              <option value="basic">Basic (Pastel Peach)</option>
              <option value="phong">Phong (Pastel Coral)</option>
              <option value="lambert">Lambert (Pastel Pink)</option>
            </select>
          </div>
        </div>

        <div className="control-section actions">
          <button onClick={addCylinder}>Add Cylinder</button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 10] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <OrbitControls />
          <axesHelper args={[5]} />
          {Object.entries(cylinderParams).map(([id, params]) => (
            <Scene
              key={id}
              cylinderId={id}
              cylinderProps={params}
              isSelected={id === selectedCylinder}
              cylinderRefSetter={(mesh) =>
                setCylinderMeshes((prev) => ({ ...prev, [id]: mesh }))
              }
              onSelect={handleCylinderSelect}
            />
          ))}
        </Canvas>
      </div>
    </div>
  );
}

export default App;
