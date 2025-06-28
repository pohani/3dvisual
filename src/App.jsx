// App.jsx
import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import './App.css';

// Reusable control: shows a label, a number input, and a slider.
function LabeledControl({ label, value, onChange, sliderMin, sliderMax, step, extraLabel }) {
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
      {extraLabel && <span className="extra-label">{extraLabel}</span>}
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
        case 'concrete':
          return <meshBasicMaterial color="#8B8B8B" />; // Concrete Gray
        case 'steel':
          return <meshPhongMaterial color="#708090" />; // Steel Blue-Gray
        case 'wood':
          return <meshLambertMaterial color="#8B4513" />; // Wood Brown
        default:
          return <meshStandardMaterial color="#696969" />; // Default Metal Gray
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

  // Multiply rotation values by PI for visual representation
  const { rotation, ...restProps } = cylinderProps;
  const meshRotation = rotation.map((v) => v * Math.PI);
  return (
    <Cylinder
      id={cylinderId}
      {...restProps}
      rotation={meshRotation}
      ref={meshRef}
      onClick={onSelect}
      isSelected={isSelected}
    />
  );
}

// Helper: Convert Euler angles (in radians) to a direction vector (unit vector along cylinder axis)
function eulerToDirection([rotX, rotY, rotZ]) {
  // Start with vector pointing up the Y axis
  let v = [0, 1, 0];
  // Apply X rotation
  let vy = v[1] * Math.cos(rotX) - v[2] * Math.sin(rotX);
  let vz = v[1] * Math.sin(rotX) + v[2] * Math.cos(rotX);
  let vx = v[0];
  // Apply Y rotation
  let vx2 = vx * Math.cos(rotY) + vz * Math.sin(rotY);
  let vz2 = -vx * Math.sin(rotY) + vz * Math.cos(rotY);
  let vy2 = vy;
  // Apply Z rotation
  let vx3 = vx2 * Math.cos(rotZ) - vy2 * Math.sin(rotZ);
  let vy3 = vx2 * Math.sin(rotZ) + vy2 * Math.cos(rotZ);
  let vz3 = vz2;
  // Normalize
  const len = Math.sqrt(vx3 * vx3 + vy3 * vy3 + vz3 * vz3);
  return [vx3 / len, vy3 / len, vz3 / len];
}

// Helper: Check if two cylinders are colliding
function checkCylinderCollision(cyl1, cyl2) {
  // Get cylinder parameters
  const [x1, y1, z1] = cyl1.position;
  const [x2, y2, z2] = cyl2.position;
  const r1 = cyl1.radiusTop;
  const r2 = cyl2.radiusTop;
  const h1 = cyl1.height;
  const h2 = cyl2.height;
  
  // Get direction vectors
  const dir1 = eulerToDirection(cyl1.rotation.map(v => v * Math.PI));
  const dir2 = eulerToDirection(cyl2.rotation.map(v => v * Math.PI));
  
  // Calculate cylinder endpoints
  const start1 = [x1 - 0.5 * h1 * dir1[0], y1 - 0.5 * h1 * dir1[1], z1 - 0.5 * h1 * dir1[2]];
  const end1 = [x1 + 0.5 * h1 * dir1[0], y1 + 0.5 * h1 * dir1[1], z1 + 0.5 * h1 * dir1[2]];
  const start2 = [x2 - 0.5 * h2 * dir2[0], y2 - 0.5 * h2 * dir2[1], z2 - 0.5 * h2 * dir2[2]];
  const end2 = [x2 + 0.5 * h2 * dir2[0], y2 + 0.5 * h2 * dir2[1], z2 + 0.5 * h2 * dir2[2]];
  
  // Calculate distance between cylinder axes
  const axis1 = [end1[0] - start1[0], end1[1] - start1[1], end1[2] - start1[2]];
  const axis2 = [end2[0] - start2[0], end2[1] - start2[1], end2[2] - start2[2]];
  
  // Cross product of axes
  const cross = [
    axis1[1] * axis2[2] - axis1[2] * axis2[1],
    axis1[2] * axis2[0] - axis1[0] * axis2[2],
    axis1[0] * axis2[1] - axis1[1] * axis2[0]
  ];
  
  const crossMag = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
  
  // If axes are parallel, use simpler distance calculation
  if (crossMag < 0.001) {
    // Parallel cylinders - check distance between centers
    const centerDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    return centerDist < (r1 + r2);
  }
  
  // Calculate distance between cylinder axes
  const vec = [start2[0] - start1[0], start2[1] - start1[1], start2[2] - start1[2]];
  const dot1 = vec[0] * cross[0] + vec[1] * cross[1] + vec[2] * cross[2];
  const distance = Math.abs(dot1) / crossMag;
  
  // Check if distance is less than sum of radii
  return distance < (r1 + r2);
}

// Helper: Check for collisions between all cylinders
function detectCollisions(cylinderParams) {
  const collisions = [];
  const cylinderIds = Object.keys(cylinderParams);
  
  for (let i = 0; i < cylinderIds.length; i++) {
    for (let j = i + 1; j < cylinderIds.length; j++) {
      const id1 = cylinderIds[i];
      const id2 = cylinderIds[j];
      const cyl1 = cylinderParams[id1];
      const cyl2 = cylinderParams[id2];
      
      if (checkCylinderCollision(cyl1, cyl2)) {
        collisions.push([id1, id2]);
      }
    }
  }
  
  return collisions;
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
      materialType: 'concrete',
    },
    cylinder2: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      rotation: [0, 0, 0],
      position: [2, 0, 0],
      materialType: 'concrete',
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
        materialType: 'concrete',
      },
    }));
    setSelectedCylinder(newId);
  };

  // Exports cylinders to a text file.
  const handleExport = () => {
    // Check for collisions first
    const collisions = detectCollisions(cylinderParams);
    
    if (collisions.length > 0) {
      const collisionMessage = collisions.map(([id1, id2]) => 
        `${id1} and ${id2}`
      ).join(', ');
      
      const warningMessage = `⚠️ COLLISION WARNING ⚠️\n\nDetected collisions between: ${collisionMessage}\n\nObjects are intersecting and may cause issues in your model. Please adjust their positions or sizes before exporting.\n\nDo you want to export anyway?`;
      
      if (!window.confirm(warningMessage)) {
        return; // User cancelled export
      }
    }
    
    // Material mapping
    const materialMap = {
      'concrete': 1,
      'steel': 2,
      'wood': 3,
      'standard': 4
    };
    
    let exportString = '';
    let index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const [centerX, centerY, centerZ] = params.position;
      // Convert rotation slider values (-1 to 1) to radians
      const [rotX, rotY, rotZ] = params.rotation.map(v => v * Math.PI);
      const height = params.height;
      const radius = params.radiusTop; // symmetric
      // Get direction vector (unit)
      const [dx, dy, dz] = eulerToDirection([rotX, rotY, rotZ]);
      // Bottom base center = center - 0.5 * height * direction
      const bottomX = centerX - 0.5 * height * dx;
      const bottomY = centerY - 0.5 * height * dy;
      const bottomZ = centerZ - 0.5 * height * dz;
      // Direction vector from bottom to top base (length = height)
      const dirX = dx * height;
      const dirY = dy * height;
      const dirZ = dz * height;
      // Export: rcc <index> <bottom_x> <bottom_y> <bottom_z> <dir_x> <dir_y> <dir_z> <radius>
      exportString += `rcc ${index} ${bottomX.toFixed(6)} ${bottomY.toFixed(6)} ${bottomZ.toFixed(6)} ${dirX.toFixed(6)} ${dirY.toFixed(6)} ${dirZ.toFixed(6)} ${radius.toFixed(6)}\n`;
      index++;
    }
    exportString += 'end body\n';
    
    // Zone definitions with material mapping
    index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `zn${index} 1 ${index}\n`;
      index++;
    }
    exportString += 'end zone\n';
    
    // Material list per body
    index = 1;
    for (const [id, params] of Object.entries(cylinderParams)) {
      const materialInt = materialMap[params.materialType] || 1;
      exportString += `${materialInt} `;
      index++;
    }
    
    //exportString += '1 2 2 1000 0\n';
    exportString += '\noesnt worend geom\n';

    const blob = new Blob([exportString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.txt';
    link.click();
    
    // Show success message only if there were collisions
    if (collisions.length > 0) {
      alert('⚠️ Export completed with collision warnings. Please review your model.');
    }
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
              materialType: 'concrete',
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
            sliderMin={-1}
            sliderMax={1}
            step={0.01}
            extraLabel={"× π"}
          />
          <LabeledControl
            label="Rotation Y:"
            value={cylinderParams[selectedCylinder].rotation[1]}
            onChange={(v) => updateRotation(1, v)}
            sliderMin={-1}
            sliderMax={1}
            step={0.01}
            extraLabel={"× π"}
          />
          <LabeledControl
            label="Rotation Z:"
            value={cylinderParams[selectedCylinder].rotation[2]}
            onChange={(v) => updateRotation(2, v)}
            sliderMin={-1}
            sliderMax={1}
            step={0.01}
            extraLabel={"× π"}
          />
        </div>

        {/* Position Controls */}
        <div className="control-section">
          <h3>Position (Center of object)</h3>
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
              <option value="standard">Metal (Gray)</option>
              <option value="concrete">Concrete (Gray)</option>
              <option value="steel">Steel (Blue-Gray)</option>
              <option value="wood">Wood (Brown)</option>
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
